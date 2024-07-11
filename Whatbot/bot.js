// importing all the necessary libraries
const axios = require("axios");
const config = require("./config.js");
const express = require("express");
const ngrok = require("ngrok");
const bodyParser = require("body-parser");
const fs = require("fs");
const mg = require("mongoose");
const multer = require("multer");
const quotesy = require("quotesy");
const path = require('path');

const User = require("./schema.js");
const dbConnect = require("./connection.js");

// necessary variable declarations
const app = express();
const API_URL = "https://api.wassenger.com/v1";

app.use(bodyParser.json());

/* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
/*
STATE MANAGEMENT FOR WHATBOT

STATE 0 --> IGNORE
STATE 1 --> INTRODUCTION
STATE 2 --> SAMPLE MESSAGES
STATE 3 --> ASK CHATBOT GENERAL Q/A
STATE 4 --> ASK CHATBOT PDF Q/A
STATE 5 --> ASK CHATBOT FOR IMAGE GENERATION
STATE 6 --> PROMPT HISTORY
*/
/* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/


/* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
const helpMessage1 = `You can type any number corresponding to the service below to use it.

1) Receive Samples 😁
2) Personal Chatbot 🤖
3) PDF Chatbot 📄
4) Image Generation Chatbot 📷
5) Prompt History 📃

You can type "help" to see this message again
You can also type "cancel" to to exit

Give it a try 😁`;
/* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
const helpMessage2 = `Following is the list of all available samples:
1) Quote 📝
2) Image 📷
3) Audio 🔉
4) Video 📽
5) Emoji 😀
6) PDF Document 📄
7) Contact 📞
8) Location 👇

Either type the sample's number or it's kind to receive it

You can type "help" to see this message again
You can also type "cancel" to to exit

Give it a try 😁`;
/* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
const helpMessage3 = `Ask me anything and I am sure to reply to anything you say 😊

You can type "help" to see this message again
You can also type "cancel" to to exit`;
/* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
const helpMessage4 = `You can send any amount of PDF documents 📄 and I will answer your questions ❓ based on the data in the documents you sent me.`;
/* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
const helpMessage5 = `Please describe the image in detail which you would like me to generate 📷`;
/* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
const welcomeMessage1 = `Hey there 👋 Welcome to this chatbot demo! 🥳🥳

My name is Whatbot and i'm here to help you 😉😎`;
/* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
const welcomeMessage2 = `Welcome to WhatSamples 📃`;
/* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
const welcomeMessage3 = `Hey there 👋 This is WhatLLM and I will answer anything you ask.`;
/* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
const welcomeMessage4 = `Hey there 👋 This is WhatPDLM and I will answer anything you ask reagrding a specific PDF file.`;
/* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
const welcomeMessage5 = `Hey there 👋 This is WhatSD and I will generate any image that you describe.`
/* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
const numberMessage = `Oops you entered an invalid number 😕

Please enter a number from the list of options or type "help" to see the list of available options`;
/* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
const unknownCommandMessage = `Sorry, I didn't understand that command. Please try again by replying with one of the available options 
OR 
type "help" to see the available options 
OR 
type "cancel" to exit.`;
/* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
const hiMessage = `Hey there 😊

How are you doing??`;
/* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
const cancelMessage1 = `Goodbye 😔!! Have a great day 😴`;
/* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
const cancelMessage2 = `Goodbye 😔!! I hope you liked my samples 🥺`;
/* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
const cancelMessage3 = `Goodbye !! I hope to see you soon
                    -- WhatLLM`;
/* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
const cancelMessage4 = `I hope I answered your questions correctly 😊

Goodbye for now 🥺`;
/* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
const cancelMessage5 = `I hope you liked my generated images 😊`;
/* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
const whatMessage = `Yes, how may I help you 🤔??`;
/* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
const unknownDocMessage = `You sent a document which is not a PDF 😕

I can only process PDF files 😐
Sorry for the inconvenience 😔`;
/* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
const pdfReadyMessage = `I have studied the PDF 😎😎

Go ahead and ask any question related to it 😏`;
/* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

// route to get the incoming message's detail when wassenger makes a post request on this url
app.post(`/webhook`, (req, res) => {
    const { body } = req;
    if (!body || !body.event || !body.data) {
        return res.status(400).send({ message: "Invalid payload body" });
    }
    if (body.event !== "message:in:new") {
        return res.status(202).send({
            message: "Ignore webhook event: only message:in:new is accepted",
        });
    }
    res.send({ ok: true });

    processMessage(body).catch((err) => {
        console.error(
            "[error] failed to process inbound message:",
            body.id,
            body.data.fromNumber,
            body.data.body,
            err
        );
    });
});

// route to send a message
app.post("/message", (req, res) => {
    const { body } = req;
    if (!body || !body.phone || !body.message) {
        return res.status(400).send({ message: "Invalid payload body" });
    }

    sendMessage(body)
        .then((data) => {
            res.send(data);
        })
        .catch((err) => {
            res.status(+err.status || 500).send(
                err.response
                    ? err.response.data
                    : {
                        message: "Failed to send message",
                    }
            );
        });
});

// middleware for catching errors
app.use((err, req, res, next) => {
    res.status(+err.status || 500).send({
        message: `Unexpected error: ${err.message}`,
    });
});

// function for instructions to follow on a particular message
async function processMessage(details) {
    const data = details.data;
    const device = details.device;
    const quote = details.id;
    const body = data.body ? data.body.trim() : undefined;
    const phone = data.fromNumber;
    const person = data.chat.name || phone;
    let info;
    let message;
    let isFirstMessage;
    let state = 0;

    // only in chats
    if (data.chat.type !== "chat") {
        return false;
    }

    // message identification
    console.log(`${person} sent ${body}`);

    // checking if they are present in the table
    let user = await User.findOne({ Number: phone }).catch((err) => {
        console.log("User not found\n", err);
    });

    // console the user state
    console.log("user state is ", user === null ? "undefined for now" : user.state);

    // saving user message as prompt or no prompt
    if (user) {
        if (user.state >= 1 && user.state <= 2) {
            console.log("User already exists and adding non prompt message");
            await User.updateOne(
                { Number: phone },
                { $push: { chatMessage: { Content: body, Type: data.type, Tag: "NP" } } }
            );
        }
        else if (user.state === 3 || user.state === 4 || user.state === 5) {
            console.log("User already exists");
            if (/exit|cancel|help/i.test(body)) {
                console.log("Adding non prompt message");
                await User.updateOne(
                    { Number: phone },
                    { $push: { chatMessage: { Content: body, Type: data.type, Tag: "NP" } } }
                );
            }
            else {
                if (user.state === 3) {
                    console.log("Adding general message");
                    await User.updateOne(
                        { Number: phone },
                        { $push: { chatMessage: { Content: body, Type: data.type, Tag: "GP" } } }
                    );
                }
                else if (user.state === 4 && data.type === "text") {
                    console.log("Adding pdf prompt message");
                    await User.updateOne(
                        { Number: phone },
                        { $push: { chatMessage: { Content: body, Type: data.type, Tag: "PP" } } }
                    );
                }
                else if (user.state === 5) {
                    console.log("Adding image generation message");
                    await User.updateOne(
                        { Number: phone },
                        { $push: { chatMessage: { Content: body, Type: data.type, Tag: "IP" } } }
                    );
                }
            }
        }

        user = await User.findOne({ Number: phone }).catch((err) => {
            console.log("User not found\n", err);
        });
    }

    /* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    /* ---------------------------------------------------------------------------------------   STATE = 0   -----------------------------------------------------------------------*/
    /* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    if (user === null || user.state === 0) {
        console.log("In user state 0 condition");
        if (/Whatbot/i.test(body)) {
            if (!user) {
                const userDoc = {
                    Number: phone,
                    chatMessage: [{ Content: data.body, Type: data.type, Tag: "NP" }],
                    state: 1
                };

                if (data.chat.name) {
                    userDoc.Name = data.chat.name;
                }

                console.log("User doesn't exists");
                await User.create(userDoc).then(() => {
                    console.log("User added successfully");
                }).catch((err) => {
                    console.log("User creation failed\n", err);
                });

                user = await User.findOne({ Number: phone }).catch((err) => {
                    console.log("User not found\n", err);
                });
                isFirstMessage = true;
            }
            else {
                isFirstMessage = false;
                user = await User.findOneAndUpdate(
                    { Number: phone },
                    {
                        $set: { state: 1 },
                        $push: { chatMessage: { Content: body, Type: data.type, Tag: "NP" } }
                    },
                    { new: true, runValidators: true }
                );
            }
        }
        else {
            return null;
        }
    }
    /* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    /* ---------------------------------------------------------------------------------------   DATATYPES   -----------------------------------------------------------------------*/
    /* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    if (user.state) {
        console.log("Checking for other datatypes");
        if (data.type === "video" || data.type === "location" || data.type === "gif" || data.type === "sticker" || data.type === "document") {
            if (user.state === 4 && data.type === "document") {
            } else {
                message = `You sent a ${data.type} but my capabilities are limited to responding only to specific text.
                        I'm sorry for the inconvenience, ${device.alias} will respond to your message as soon as possible.`;
                info = {
                    phone,
                    message,
                    quote,
                };
                console.log(info.message);
                return await sendMessage(info);
            }
        } else if (data.type === "audio") {
            message = `You sent an ${data.type} but my capabilities are limited to responding only to specific text.
                    I'm sorry for the inconvenience, ${device.alias} will respond to your message as soon as possible.`;
            info = {
                phone,
                message,
                quote,
            };
            console.log(info.message);
            return await sendMessage(info);
        } else if (data.type === "call_log") {
            message = `You just called ${device.alias}. If he responded then great otherwise you will receive a call soon.`;
            info = {
                phone,
                message,
                quote,
            };
            console.log(info.message);
            return await sendMessage(info);
        } else if (data.type === "contacts") {
            message = `You sent a contact but my capabilities are limited to responding only to specific text.
                    I'm sorry for the inconvenience, ${device.alias} will respond to your message as soon as possible.`;
            info = {
                phone,
                message,
                quote,
            };
            console.log(info.message);
            return await sendMessage(info);
        }
    }
    /* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    /* ---------------------------------------------------------------------------------------   STATE = 1   -----------------------------------------------------------------------*/
    /* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    if (user.state === 1) {
        console.log("In user state 1 condition");
        if (isFirstMessage) {
            info = {
                phone,
                message: welcomeMessage1 + "\n\n" + helpMessage1,
                quote
            };
            console.log(info.message);
            return await sendMessage(info);
        }

        if (/help/i.test(body)) {
            info = {
                phone,
                message: helpMessage1,
                quote
            };
        }
        else if (+body === 1) {
            user = await User.findOneAndUpdate(
                { Number: phone },
                { $set: { state: 2 } },
                { new: true, runValidators: true }
            );

            info = {
                phone,
                message: welcomeMessage2 + "\n\n" + helpMessage2,
                quote
            };
        }
        else if (+body === 2) {
            user = await User.findOneAndUpdate(
                { Number: phone },
                { $set: { state: 3 } },
                { new: true, runValidators: true }
            );

            info = {
                phone,
                message: welcomeMessage3 + "\n\n" + helpMessage3,
                quote
            };
        }
        else if (+body === 3) {
            user = await User.findOneAndUpdate(
                { Number: phone },
                { $set: { state: 4 } },
                { new: true, runValidators: true }
            );

            info = {
                phone,
                message: welcomeMessage4 + "\n\n" + helpMessage4,
                quote
            };
        }
        else if (+body === 4) {
            user = await User.findOneAndUpdate(
                { Number: phone },
                { $set: { state: 5 } },
                { new: true, runValidators: true }
            );

            info = {
                phone,
                message: welcomeMessage5 + "\n\n" + helpMessage5,
                quote
            };
        }
        else if (+body === 5) {
            const template = 'Following is your prompt history with WhatLLM:\n\nGeneral Queries History:-\n${Ghistory}\nPDF Queries History:-\n${Phistory}\nImage Gneration History:-\n${Ihistory}';
            let Ghistory = "" , Gflag = false;                
            let Phistory = "" , Pflag = false;            
            let Ihistory = "" , Iflag = false;
            user.chatMessage.forEach(msg => {
                if (msg.Tag === "GP") {
                    Ghistory = Ghistory + msg.Content + "--" + msg.Timestamp + "\n";
                    Gflag = true;
                } else if (msg.Tag === "PP") {
                    Phistory = Phistory + msg.Content + "--" + msg.Timestamp + "\n";
                    Pflag = true;
                } else if (msg.Tag === "IP") {
                    Ihistory = Ihistory + msg.Content + "--" + msg.Timestamp + "\n";
                    Iflag = true;
                }
            });

            if (!Gflag) {
                Ghistory = "You didn't had a conversation with WhatLLM\n";
            }
            if (!Pflag) {
                Phistory = "You didn't had a conversation with WhatPDLM\n"
            }
            if (!Iflag) {
                Ihistory = "You didn't had a conversation with WhatSD\n"
            }

            const vars = {
                Ghistory,
                Phistory,
                Ihistory
            };

            const history = template.replace(/\${(.*?)}/g, (match, p1) => vars[p1.trim()] || '');

            info = {
                phone,
                message: history,
                quote
            };
        }
        else if (+body > 5 || +body < 1) {
            info = {
                phone,
                message: numberMessage,
                quote
            };
        }
        else if (/exit|cancel/i.test(body)) {
            user = await User.findOneAndUpdate(
                { Number: phone },
                { $set: { state: 0 } },
                { new: true, runValidators: true }
            );

            info = {
                phone,
                message: cancelMessage1,
                quote
            };
        }
        else if (/Whatbot/i.test(body) || !isFirstMessage) {
            info = {
                phone,
                message: whatMessage,
                quote
            };
        }
        else if (/Hey|hi|howdy|hello/i.test(body)) {
            info = {
                phone,
                message: hiMessage,
                quote
            };
        }
        else {
            info = {
                phone,
                message: unknownCommandMessage,
                quote
            };
        }
        console.log(info.message);
        return await sendMessage(info);
    }
    /* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    /* ---------------------------------------------------------------------------------------   STATE = 2   -----------------------------------------------------------------------*/
    /* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    if (user.state === 2) {
        console.log("In user state 2 condition");
        if (/exit|cancel/i.test(body)) {
            user = await User.findOneAndUpdate(
                { Number: phone },
                { $set: { state: 1 } },
                { new: true, runValidators: true }
            );

            info = {
                phone,
                message: cancelMessage2,
                quote
            };

            await sendMessage(info);

            info.message = helpMessage1;
            info.quote = undefined;
        }
        else if (/Whatbot/i.test(body)) {
            info = {
                phone,
                message: whatMessage,
                quote
            };
        }
        else if (/Hey|hi|howdy|hello/i.test(body)) {
            info = {
                phone,
                message: hiMessage,
                quote
            };
        }
        else if (/help/i.test(body)) {
            info = {
                phone,
                message: helpMessage2,
                quote
            };
        }
        else if (+body === 1) {
            const quotes = quotesy.random();

            info = {
                phone,
                message: `${quotes.text}
                                -- ${quotes.author}`,
                quote,
            };
        }
        else if (+body === 2) {
            info = {
                phone,
                message: "A random image",
                quote,
                media: {
                    url: "https://picsum.photos/600/400",
                    viewOnce: false,
                },
            };
        }
        else if (+body === 3) {
            info = {
                phone,
                quote,
                media: {
                    url: "https://download.samplelib.com/mp3/sample-9s.mp3",
                    format: "ptt",
                }
            };
        }
        else if (+body === 4) {
            info = {
                phone,
                message: "Nature 🤩🤩",
                quote,
                media: {
                    url: "https://download.samplelib.com/mp4/sample-5s.mp4",
                }
            };
        }
        else if (+body === 5) {
            const emoarr = ["😂", "😍", "😑", "😭", "😠"];
            info = {
                phone,
                message: emoarr[Math.floor(Math.random() * emoarr.length)],
                quote,
            };
        }
        else if (+body === 6) {
            info = {
                phone,
                quote,
                media: {
                    url: "https://www.irjet.net/archives/V9/i4/IRJET-V9I4398.pdf",
                },
            };
        }
        else if (+body === 7) {
            info = {
                phone,
                quote,
                contacts: [
                    {
                        phone: "+923368958281",
                        name: "Aneeq Muneer",
                    },
                ],
            };
        }
        else if (+body === 8) {
            info = {
                phone,
                quote,
                location: {
                    coordinates: [24.925206, 67.097371],
                },
                message: "Avancera Solutions",
            };
        }
        else if (+body > 8 || +body < 1) {
            info = {
                phone,
                message: numberMessage,
                quote
            };
        }
        else {
            info = {
                phone,
                message: unknownCommandMessage,
                quote
            };
        }
        console.log(info.message);
        return await sendMessage(info);
    }
    /* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    /* ---------------------------------------------------------------------------------------   STATE = 3   -----------------------------------------------------------------------*/
    /* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    if (user.state === 3) {
        console.log("In user state 3 condition");
        if (/exit|cancel/i.test(body)) {
            user = await User.findOneAndUpdate(
                { Number: phone },
                { $set: { state: 1 } },
                { new: true, runValidators: true }
            );

            info = {
                phone,
                message: cancelMessage3,
                quote
            };

            await sendMessage(info);

            info.message = helpMessage1;
            info.quote = undefined;
        }
        else if (/help/i.test(body)) {
            info = {
                phone,
                message: helpMessage3,
                quote
            };
        }
        else {
            const url = config.agentLink + "/general";
            let ans;

            const data = {
                question: body
            };

            const options = {
                method: "POST",
                url,
                headers: {
                    "Content-Type": "application/json"
                },
                data,
            };

            // asking the AI agent
            console.log("Asking agent");
            try {
                const response = await axios.request(options);
                console.log("Message sent successfully.");
                console.log(response.data.answer);
                ans = response.data.answer;
            } catch (err) {
                console.error("Failed to send message.\n", err.message);
            }

            info = {
                phone,
                message: ans,
                quote,
            };
        }
        console.log(info.message);
        return await sendMessage(info);
    }
    /* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    /* ---------------------------------------------------------------------------------------   STATE = 4   -----------------------------------------------------------------------*/
    /* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    if (user.state === 4) {
        console.log("In user state 4 condition");
        if (/exit|cancel/i.test(body)) {
            user = await User.findOneAndUpdate(
                { Number: phone },
                { $set: { state: 1 } },
                { new: true, runValidators: true }
            );

            info = {
                phone,
                message: cancelMessage4,
                quote
            };

            await sendMessage(info);

            info.message = helpMessage1;
            info.quote = undefined;
        }
        else if (/help/i.test(body)) {
            info = {
                phone,
                message: helpMessage4,
                quote
            };
        }
        else {
            if (data.type === "document") {
                if (data.media.extension === "pdf") {
                    console.log("User sent a document which is a PDF.");

                    const url = config.agentLink + "/pdf";
                    console.log(config.wassengerLink + data.media.links.download);

                    const body = {
                        pdfUrl: config.wassengerLink + data.media.links.download,
                        pdfName: data.body,
                        msgId: details.id,
                        senderNum: phone
                    };

                    const options = {
                        method: "POST",
                        url,
                        headers: {
                            "Content-Type": "application/json"
                        },
                        data: body,
                    };

                    try {
                        await axios.request(options);
                        info = {
                            phone,
                            message: pdfReadyMessage,
                            quote
                        };
                    } catch (err) {
                        console.error("Failed to send message.\n", err.message);
                    }

                } else {
                    info = {
                        phone,
                        message: unknownDocMessage,
                        quote
                    };
                }
            } else if (data.type === "text") {
                const url = config.agentLink + "/ans";

                const options = {
                    method: "POST",
                    url,
                    headers: {
                        "Content-Type": "application/json"
                    },
                    data: {
                        question: body
                    }
                };

                try {
                    const response = await axios.request(options);

                    info = {
                        phone,
                        message: response.data.answer,
                        quote
                    }
                } catch (err) {
                    console.error("Failed to send message.\n", err.message);
                }
            } else {
                info = {
                    phone,
                    message: unknownCommandMessage,
                    quote
                };
            }
        }

        console.log(info.message);
        return await sendMessage(info);
    }
    /* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    /* ---------------------------------------------------------------------------------------   STATE = 5   -----------------------------------------------------------------------*/
    /* -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
    if (user.state === 5) {
        console.log("In user state 5 condition");
        if (/exit|cancel/i.test(body)) {
            user = await User.findOneAndUpdate(
                { Number: phone },
                { $set: { state: 1 } },
                { new: true, runValidators: true }
            );

            info = {
                phone,
                message: cancelMessage5,
                quote
            };

            console.log(info.message);
            await sendMessage(info);

            info.message = helpMessage1;
            info.quote = undefined;

            console.log(info.message);
            await sendMessage(info);
        }
        else if (/help/i.test(body)) {
            info = {
                phone,
                message: helpMessage5,
                quote
            };
            console.log(info.message);
            await sendMessage(info);
        }
        else {
            const url = config.agentLink + "/img";

            const data = {
                prompt: body
            };

            const options = {
                method: "POST",
                url,
                headers: {
                    "Content-Type": "application/json"
                },
                data,
            };

            try {
                const response = await axios.request(options);
                const imgs = response.data.response;
                console.log(imgs);

                imgs.forEach(async img => {
                    info = {
                        phone,
                        quote,
                        media: {
                            url: img,
                            viewOnce: false,
                        },
                    };

                    await sendMessage(info);
                });

            } catch (err) {
                console.error("Failed to send message.\n", err.message);
            }
        }
    }
}

// function to send messages to the user
async function sendMessage(data) {
    const url = `${API_URL}/messages`;

    const options = {
        method: "POST",
        url,
        headers: {
            "Content-Type": "application/json",
            Token: config.apikey,
        },
        data,
    };

    axios
        .request(options)
        .then(function (response) {
            console.log("Message sent successfully.");
        })
        .catch(function (error) {
            console.error("Failed to send message.\n", error);
        });
}

// load the device which is connected to the wassenger product
async function loadDevice() {
    const url = `${API_URL}/devices`;
    const { data } = await axios.get(url, {
        headers: { Authorization: config.apikey },
    });
    const connectedDevice = data.find(
        (device) =>
            device.status === "operative" &&
            device.id === config.deviceID &&
            device.session.status === "online"
    );
    if (!data && !connectedDevice) {
        console.log("No whatsapp devices are available.");
    }
    console.log("Available device found");
    console.log(`${connectedDevice.alias} is online`);
    return connectedDevice;
}

// create a webhook so that you can get the messages when the post request is made
async function registerWebhook(tunnel, device) {
    const webhookURL = `${tunnel}/webhook`;

    const url = `${API_URL}/webhooks`;
    const { data: webhooks } = await axios.get(url, {
        headers: { Authorization: config.apikey },
    });

    const findWebhook = (webhook) => {
        return (
            webhook.url === webhookURL &&
            webhook.device === device.id &&
            webhook.status === "active" &&
            webhook.events.includes("message:in:new")
        );
    };

    const existing = webhooks.find(findWebhook);
    if (existing) {
        return existing;
    }

    for (const webhook of webhooks) {
        if (
            webhook.url.includes("ngrok-free.app") ||
            webhook.url.startsWith(tunnel)
        ) {
            const url = `${API_URL}/webhooks/${webhook.id}`;
            await axios.delete(url, { headers: { Authorization: config.apikey } });
        }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));

    const data = {
        url: webhookURL,
        name: "Chatbot",
        events: ["message:in:new"],
        device: device.id,
    };

    const { data: webhook } = await axios.post(url, data, {
        headers: { Authorization: config.apikey },
    });

    return webhook;
}

function exit(msg, ...args) {
    console.error("[error]", msg, ...args);
    process.exit(1);
}

// this function loads the device and then registers the webhook and the chatbot gets ready to receive the messages
async function main() {
    const device = loadDevice();

    app.listen(config.port, () => {
        console.log(`Server listening on port ${config.port}`);
    });

    // if (config.production) {
    console.log("[info] Validating webhook endpoint...");
    if (!config.webhookURL) {
        return exit(
            "Missing required environment variable: WEBHOOK_URL must be present in production mode"
        );
    }
    const webhook = await registerWebhook(config.webhookURL, device);
    if (!webhook) {
        return exit(
            `Missing webhook active endpoint in production mode: please create a webhook endpoint that points to the chatbot server:\nhttps://app.wassenger.com/${device.id}/webhooks`
        );
    }
    else {
        console.log('[info] Registering webhook tunnel...');
        const tunnel = config.webhookURL || await createTunnel();
        const webhook = await registerWebhook(tunnel, device);
        if (!webhook) {
            console.error('Failed to connect webhook. Please try again.');
            await ngrok.kill();
            return process.exit(1);
        }
    }
    console.log("[info] Using webhook endpoint in production mode:", webhook.url);

    console.log("[info] Chatbot server ready and waiting for messages!");
    await dbConnect();
}

// catching any error if it gets thrown in the main function
main().catch((err) => {
    exit("Failed to start chatbot server:", err);
});