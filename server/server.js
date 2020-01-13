const http = require("http");
const path = require("path");
const fse = require("fs-extra");
const multiparty = require("multiparty");

const server = http.createServer();
const UPLOAD_DIR = path.resolve(__dirname, "..", "target"); // 大文件存储目录


const resolvePost = req =>
    new Promise(resolve => {
        let chunk = "";
        req.on("data", data => {
            chunk += data;
        });
        req.on("end", () => {
            resolve(JSON.parse(chunk));
        });
    });

// 合并切片
const mergeFileChunk = async (filePath, filename) => {
    const chunkDir = `${UPLOAD_DIR}\\${filename}`;
    const chunkPaths = await fse.readdir(chunkDir);
     await fse.writeFile(filePath, "");
    chunkPaths.forEach(chunkPath => {
        fse.appendFileSync(filePath, fse.readFileSync(`${chunkDir}\\${chunkPath}`));
        fse.unlinkSync(`${chunkDir}\\${chunkPath}`);
    });
    fse.rmdirSync(chunkDir); // 合并后删除保存切片的目录
};




server.on("request", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    if (req.method === "OPTIONS") {
        res.status = 200;
        res.end();
        return;
    }
    if (req.url === "/merge") {
       try{
        const data = await resolvePost(req);
        const { filename } = data;
        const filePath = `${UPLOAD_DIR}\\${filename}`;
        console.log(filePath)
        await mergeFileChunk(filePath, filename);
        res.end(
            JSON.stringify({
                code: 0,
                message: "file merged success"
            })
        );
       }catch(e){
           console.log(e)
           console.log('出差了')
       }
    }

    const multipart = new multiparty.Form();

    multipart.parse(req, async (err, fields, files) => {
        if (err) {
            return;
        }
        const [chunk] = files.chunk;
        const [hash] = fields.hash;
        const [filename] = fields.filename;
        const chunkDir = `${UPLOAD_DIR}\\${filename}`;

        // 切片目录不存在，创建切片目录
        if (!fse.existsSync(chunkDir)) {
            await fse.mkdirs(chunkDir);
        }

        // 重命名文件
        await fse.rename(chunk.path, `${chunkDir}/${hash}`);
        res.end("received file chunk");
    });
});

server.listen(3000, () => console.log("正在监听 3000 端口"));

