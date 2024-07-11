const request = require("request");
const config = require("../../config.js");

const txt2img = async (prompt, negative_prompt = "bad quality, blur", width = "512", height = "512", samples = 1) => {
    console.log("In txt2img");
    
    return new Promise((resolve, reject) => {
        const options = {
            method: 'POST',
            url: config.sdUrl,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                key: config.sdAPI,
                prompt: prompt,
                negative_prompt,
                width,
                height,
                safety_checker: false,
                seed: null,
                samples,
                base64: false,
                webhook: null,
                track_id: null,
                watermark: false,
                instant_response : false,
                enhance_prompt : true
            })
        };

        request(options, async function (error, response) {
            if (error) {
                console.log("An error occurred while generating the image");
                console.error(error);
                reject(error);
            } else {
                console.log("Image generated successfully.");
                try {
                    const body = JSON.parse(response.body);
                    const imgUrl = body.output;
                    console.log(imgUrl);
                    resolve(imgUrl);
                } catch (e) {
                    reject(e);
                }
            }
        });
    });
}

module.exports = txt2img;