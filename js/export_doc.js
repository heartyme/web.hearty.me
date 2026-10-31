"use strict";

// 匯出日記成 Word 文件 (.docx)：需先載入 fflate
// data: export_doc_data 的回傳值；writable: FileSystemWritableFileStream；on_progress(done, total)
async function export_doc(data, writable, on_progress){
	let zip_err = null,
		chain = Promise.resolve(),
		zip = new fflate.Zip(function(err, chunk){
			if(err) zip_err = err;
			else chain = chain.then(function(){
				return writable.write(chunk);
			});
		}),
		flush = function(){
			if(zip_err) throw zip_err;
			return chain;
		},
		add_file = function(name, bytes, deflate){
			let f = deflate ? new fflate.ZipDeflate(name, {level: 6}) : new fflate.ZipPassThrough(name);
			zip.add(f);
			f.push(bytes, true);
		},
		add_xml = function(name, xml){
			add_file(name, fflate.strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'+xml), true);
		};

	let lang = doc_lang(data["lang"]),
		rels = [],
		body = [doc_cover(data)],
		n = 0, skipped = 0, done = 0;

	// 固定內容先寫入
	add_xml("[Content_Types].xml", doc_content_types());
	add_xml("_rels/.rels", doc_root_rels());
	add_xml("docProps/core.xml", doc_core(data));
	add_xml("word/styles.xml", doc_styles(lang));

	// 相片依日記順序排成佇列，各張完成時 resolve
	let jobs = [];
	data["posts"].forEach(function(p){
		p["images"].forEach(function(img){
			let job = {img: img};
			job.result = new Promise(function(resolve){
				job.resolve = resolve;
			});
			jobs.push(job);
		});
	});

	let next = 0,
		worker = async function(){
			while(next<jobs.length){
				let job = jobs[next++],
					im = await doc_process_image(job.img);

				if(im){
					im.n = ++n;
					add_file("word/media/image"+im.n+"."+im.ext, im.bytes);
					rels.push('<Relationship Id="rId'+(100+im.n)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image'+im.n+"."+im.ext+'"/>');
					im.bytes = null;
					await flush();
				}
				else{
					skipped++;
				}

				on_progress(++done, jobs.length);
				job.resolve(im);
			}
		},
		// 依日記順序產生 XML：等該篇相片全部處理完
		build = async function(){
			let i = 0, links = 0;
			for(let p of data["posts"]){
				let imgs = [];
				for(let k=0; k<p["images"].length; k++){
					imgs.push(await jobs[i++].result);
				}

				// 超連結：標題連至該篇日記、YouTube 影片
				let link = {post: "rIdP"+(++links)};
				rels.push(doc_link_rel(link.post, "https://hearty.me/"+(parseInt(data["user_id"]) || 0)+"/"+(parseInt(p["post_id"]) || 0)));
				if(p["youtube"]){
					link.youtube = "rIdY"+links;
					rels.push(doc_link_rel(link.youtube, "https://youtu.be/"+encodeURIComponent(p["youtube"])));
				}
				body.push(docx_post_xml(p, imgs, link));
			}
		};

	on_progress(0, jobs.length);

	let workers = [build()];
	for(let k=0; k<6; k++) workers.push(worker());
	await Promise.all(workers);

	add_xml("word/document.xml", doc_document(body.join("")));
	add_xml("word/_rels/document.xml.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'+rels.join("")+"</Relationships>");
	zip.end();
	await flush();
	await writable.close();

	return {images: n, skipped: skipped};
}

// 下載並處理相片：Photon → Wasabi，回傳 {bytes, ext, w, h} 或 null
async function doc_process_image(img){
	let path = img[0],
		rotated = (parseInt(img[1]) || 0)%4,
		srcs = [
			["photon", "https://i0.wp.com/s3.ap-northeast-1.wasabisys.com/hearty-journals/"+path+"?fit=1280,1280&strip=all"],
			["wasabi", "https://s3.ap-northeast-1.wasabisys.com/hearty-journals/"+path]
		];

	for(let [src, url] of srcs){
		let bytes = await doc_fetch(url, src=="wasabi"),
			type = bytes ? doc_sniff(bytes) : null;
		if(!type) continue;

		try{
			if(src=="photon" && type!="webp" && rotated==0){
				let s = doc_header_size(bytes, type);
				if(s) return {bytes: bytes, ext: {jpeg: "jpg", png: "png", gif: "gif"}[type], w: s[0], h: s[1]};
			}
			return await doc_canvas_image(bytes, type, rotated);
		}
		catch(e){}
	}
	return null;
}
	// 15秒逾時；Wasabi 不用瀏覽器快取，避免取到沒有 CORS 標頭的快取
	async function doc_fetch(url, no_store){
		let ac = new AbortController(),
			t = setTimeout(function(){
				ac.abort();
			}, 15000);
		try{
			let r = await fetch(url, {signal: ac.signal, credentials: "omit", cache: no_store ? "no-store" : "default"});
			return r.ok ? new Uint8Array(await r.arrayBuffer()) : null;
		}
		catch(e){
			return null;
		}
		finally{
			clearTimeout(t);
		}
	}

	// 依 magic bytes 判斷格式
	function doc_sniff(b){
		let s = function(i, str){
			for(let k=0; k<str.length; k++){
				if(b[i+k]!==str.charCodeAt(k)) return false;
			}
			return true;
		};
		if(b.length<12) return null;
		if(b[0]==0xFF && b[1]==0xD8 && b[2]==0xFF) return "jpeg";
		if(b[0]==0x89 && s(1, "PNG\r\n\x1a\n")) return "png";
		if(s(0, "GIF8")) return "gif";
		if(s(0, "RIFF") && s(8, "WEBP")) return "webp";
		return null;
	}

	// 從檔頭讀取寬高 [w, h]，讀不到回傳 null
	function doc_header_size(b, type){
		let w = 0, h = 0;
		if(type=="png" && b.length>24){
			w = (b[16]<<24 | b[17]<<16 | b[18]<<8 | b[19])>>>0;
			h = (b[20]<<24 | b[21]<<16 | b[22]<<8 | b[23])>>>0;
		}
		else if(type=="gif"){
			w = b[6] | b[7]<<8;
			h = b[8] | b[9]<<8;
		}
		else if(type=="jpeg"){
			let i = 2;
			while(i+9<b.length){
				if(b[i]!=0xFF) return null;
				let m = b[i+1];
				if(m==0xFF){ // 填充位元
					i++;
					continue;
				}
				// SOF0–SOF15，排除 DHT(C4)、JPG(C8)、DAC(CC)
				if(m>=0xC0 && m<=0xCF && m!=0xC4 && m!=0xC8 && m!=0xCC){
					h = b[i+5]<<8 | b[i+6];
					w = b[i+7]<<8 | b[i+8];
					break;
				}
				i += (m==0x01 || (m>=0xD0 && m<=0xD8)) ? 2 : 2+(b[i+2]<<8 | b[i+3]);
			}
		}
		return w>0 && h>0 ? [w, h] : null;
	}

	// canvas：長邊縮至 1280px、順時針旋轉 rotated×90°；PNG 輸出 PNG，其餘輸出 JPEG
	async function doc_canvas_image(bytes, type, rotated){
		let bmp = await createImageBitmap(new Blob([bytes]), {imageOrientation: "none"});
		try{
			let s = Math.min(1, 1280/Math.max(bmp.width, bmp.height)),
				dw = Math.max(1, Math.round(bmp.width*s)),
				dh = Math.max(1, Math.round(bmp.height*s)),
				cw = rotated%2 ? dh : dw,
				ch = rotated%2 ? dw : dh,
				png = type=="png",
				c = new OffscreenCanvas(cw, ch),
				ctx = c.getContext("2d");

			if(!png){
				ctx.fillStyle = "#fff";
				ctx.fillRect(0, 0, cw, ch);
			}
			ctx.imageSmoothingQuality = "high";
			ctx.translate(cw/2, ch/2);
			ctx.rotate(rotated*Math.PI/2);
			ctx.drawImage(bmp, -dw/2, -dh/2, dw, dh);

			let blob = await c.convertToBlob(png ? {type: "image/png"} : {type: "image/jpeg", quality: 0.85});
			return {bytes: new Uint8Array(await blob.arrayBuffer()), ext: png ? "png" : "jpg", w: cw, h: ch};
		}
		finally{
			bmp.close();
		}
	}

// 相片尺寸 (96 dpi) 換算 EMU：最寬 15cm、最高 20cm，不放大
function doc_fit_size(w, h){
	let s = Math.min(1, 5400000/(w*9525), 7200000/(h*9525));
	return [Math.round(w*9525*s), Math.round(h*9525*s)];
}

function doc_esc(s){
	return (s || "").toString().replace(/[&<>"]/g, function(c){
		return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c];
	});
}

// zh-tw → zh-TW
function doc_lang(l){
	l = (l || "zh-tw").split("-");
	return l[0]+(l[1] ? "-"+l[1].toUpperCase() : "");
}

// 段落：Tab 轉成 <w:tab/>；link 為超連結的 rId，以新視窗開啟
function doc_p(text, style, link, rstyle){
	let r = (text || "").split("\t").map(function(t){
		return t ? '<w:t xml:space="preserve">'+doc_esc(t)+"</w:t>" : "";
	}).join("<w:tab/>");
	if(r){
		r = "<w:r>"+(rstyle ? '<w:rPr><w:rStyle w:val="'+rstyle+'"/></w:rPr>' : "")+r+"</w:r>";
		if(link) r = '<w:hyperlink r:id="'+link+'" w:tgtFrame="_blank">'+r+"</w:hyperlink>";
	}
	return "<w:p>"+(style ? '<w:pPr><w:pStyle w:val="'+style+'"/></w:pPr>' : "")+r+"</w:p>";
}

function doc_link_rel(id, url){
	return '<Relationship Id="'+id+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="'+doc_esc(url)+'" TargetMode="External"/>';
}

function doc_cover(data){
	return doc_p("溫度日記 Hearty Journal", "Title")+
		doc_p(data["nickname"]+"（@"+data["username"]+"）", "Subtitle")+
		doc_p(_h("a-dl_doc-8", {"$date": data["exported"], "$posts": data["posts"].length.toLocaleString()}), "Subtitle");
}

// 單篇日記：標題 (連至該篇日記)、日期、內文、相片、YouTube 連結
function docx_post_xml(p, imgs, link){
	let x = doc_p(p["title"] || p["date"], "Heading1", link.post)+doc_p(p["date"], "Date");

	(p["content"] || "").split("\n").forEach(function(line){
		x += doc_p(line);
	});

	imgs.forEach(function(im){
		if(!im) return;
		let s = doc_fit_size(im.w, im.h),
			name = "image"+im.n+"."+im.ext;
		x += '<w:p><w:pPr><w:pStyle w:val="Picture"/></w:pPr><w:r><w:drawing>'+
			'<wp:inline distT="0" distB="0" distL="0" distR="0">'+
				'<wp:extent cx="'+s[0]+'" cy="'+s[1]+'"/>'+
				'<wp:docPr id="'+im.n+'" name="Picture '+im.n+'"/>'+
				'<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'+
					"<pic:pic>"+
						'<pic:nvPicPr><pic:cNvPr id="'+im.n+'" name="'+name+'"/><pic:cNvPicPr/></pic:nvPicPr>'+
						'<pic:blipFill><a:blip r:embed="rId'+(100+im.n)+'"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'+
						'<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+s[0]+'" cy="'+s[1]+'"/></a:xfrm>'+
							'<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>'+
					"</pic:pic>"+
				"</a:graphicData></a:graphic>"+
			"</wp:inline>"+
		"</w:drawing></w:r></w:p>";
	});

	if(link.youtube){
		x += doc_p("https://youtu.be/"+p["youtube"], "", link.youtube, "Hyperlink");
	}
	return x;
}

function doc_document(body){
	return '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'+
		"<w:body>"+body+
			'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>'+
		"</w:body></w:document>";
}

function doc_styles(lang){
	let cjk = /^(zh|ja|ko)/.test(lang);
	return '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'+
		'<w:docDefaults><w:rPrDefault><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="'+(cjk ? "en-US" : lang)+'"'+(cjk ? ' w:eastAsia="'+lang+'"' : "")+"/></w:rPr></w:rPrDefault>"+
			'<w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="360" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'+
		'<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>'+
		'<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>'+
			'<w:pPr><w:spacing w:before="4800" w:after="480"/><w:jc w:val="center"/></w:pPr><w:rPr><w:b/><w:sz w:val="56"/><w:szCs w:val="56"/></w:rPr></w:style>'+
		'<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>'+
			'<w:pPr><w:spacing w:after="120"/><w:jc w:val="center"/></w:pPr><w:rPr><w:color w:val="666666"/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style>'+
		'<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>'+
			'<w:pPr><w:keepNext/><w:pageBreakBefore/><w:spacing w:after="60"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="36"/><w:szCs w:val="36"/></w:rPr></w:style>'+
		'<w:style w:type="paragraph" w:customStyle="1" w:styleId="Date"><w:name w:val="Journal Date"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/>'+
			'<w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:color w:val="888888"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>'+
		'<w:style w:type="paragraph" w:customStyle="1" w:styleId="Picture"><w:name w:val="Journal Picture"/><w:basedOn w:val="Normal"/>'+
			'<w:pPr><w:spacing w:before="120" w:after="120" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr></w:style>'+
		'<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style>'+
	"</w:styles>";
}

function doc_content_types(){
	return '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
		'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
		'<Default Extension="xml" ContentType="application/xml"/>'+
		'<Default Extension="jpg" ContentType="image/jpeg"/>'+
		'<Default Extension="png" ContentType="image/png"/>'+
		'<Default Extension="gif" ContentType="image/gif"/>'+
		'<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'+
		'<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'+
		'<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'+
	"</Types>";
}

function doc_root_rels(){
	return '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
		'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'+
		'<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'+
	"</Relationships>";
}

function doc_core(data){
	return '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'+
		"<dc:title>Hearty Journal</dc:title>"+
		"<dc:creator>"+doc_esc(data["nickname"])+"</dc:creator>"+
		'<dcterms:created xsi:type="dcterms:W3CDTF">'+new Date().toISOString().replace(/\.\d+Z$/, "Z")+"</dcterms:created>"+
	"</cp:coreProperties>";
}
