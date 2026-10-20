import fs from 'node:fs';
import path from 'node:path';
import {STICKER_STYLE_PROMPT} from '../config.js';
export async function generateSticker(subject:string,outputPath:string,provider:'manual'|'placeholder'='manual') {
 fs.mkdirSync(path.dirname(outputPath),{recursive:true});
 if(fs.existsSync(outputPath))return {path:outputPath,status:'ready',provider:'manual'};
 const request={subject,prompt:STICKER_STYLE_PROMPT,outputPath,provider,status:'pending'};
 fs.writeFileSync(outputPath+'.request.json',JSON.stringify(request,null,2));
 // Placeholder drawing is handled by the renderer, not represented as a finished PNG.
 return request;
}
