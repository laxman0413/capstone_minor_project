const axios=require('axios');
const fs=require('fs');
require("dotenv").config();

async function extractDataPii(imagePath){
    const image = fs.readFileSync(imagePath, {
        encoding: "base64"
    });
    piiLocations=[]
    const response=await axios({
        method: "POST",
        url: "https://detect.roboflow.com/projectad/6",
        params: {
            api_key: "5iYNtCTx136at7zLCkHt"
        },
        data: image,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        }
    })
    if(response.data.predictions.length>0){
        //console.log(response.data);
        response.data.predictions.forEach(element => {
            piiLocations.push({
                pattern:"QR Code",
                text:"Qr",
                location:{
                    Left:element.x-element.width/2,
                    Top:element.y-element.height/2,
                    Width:element.width,
                    Height:element.height,
                }
            })

        });
        //console.log(piiLocations)
        return piiLocations;
    }else{
        console.log("No QR Code found");
    }
}

module.exports=extractDataPii;