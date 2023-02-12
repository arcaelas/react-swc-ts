import { readFile } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import express from "express"
import { sleep, promify } from "@arcaelas/utils"


const __filename = fileURLToPath( import.meta.url )
const __dirname = dirname( __filename )

let html = promify();

async function template(){
    try {
        if(html.status !== "pending") return await html

    } catch (error) {
        html = promify()
    }
}







const app = express()

app.use( express.static( join(__dirname, "dist") ) )

app.get("*", ({ res })=>{
     
    
})



app.listen(3000, ()=>{
    console.log("Server Listen on port 3000")
})