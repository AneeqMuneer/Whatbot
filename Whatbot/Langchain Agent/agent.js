const express = require("express");
const bodyparser = require("body-parser");
const generalQA = require("./utils/generalAgent.js");
const { pdfQA, pdfStore } = require("./utils/pdfAgent.js");
const txt2img = require("./utils/imgAgent.js");
const config = require("../config.js");

const app = express();

app.use(bodyparser.json());

app.get('/', async (req, res, next) => {
    res.status(200).json({
        success: true,
        message: "agent is working"
    });
});

app.post('/general', async (req, res, next) => {
    const question = req.body.question;

    try {
        const answer = await generalQA(question);
        res.status(200).json({
            success: true,
            answer
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

app.post('/pdf', async (req, res, next) => {
    const { pdfUrl , pdfName , msgID , senderNum } = req.body;

    try {
        await pdfStore(pdfUrl , pdfName , msgID , senderNum);
        res.status(200).json({
            success: true,
            response: "File recorded successfully"
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

app.post('/ans', async (req, res, next) => {
    const { question } = req.body;

    try {
        const answer = await pdfQA(question);
        res.status(200).json({
            success: true,
            answer
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

app.post('/img', async (req, res, next) => {
    const { prompt, negative_prompt, width, height, samples } = req.body;

    try {
        const imgUrl = await txt2img(prompt, negative_prompt, width, height, samples);
        res.status(200).json({
            success: true,
            response: imgUrl
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

app.listen(config.agentPort, () => {
    console.log(`Agent running at http://localhost:${config.agentPort}`);
});