const axios = require("axios");
const config = require("../../config.js");

const generalQA = async (question) => {
    console.log("In general Q/A");
    
    const url = config.ollamaLink; // change the ollama link as needed

    const headers = {
        "Content-Type": "application/json"
    }

    const data = {
        model : "llama3",
        stream : false,
        prompt : question
    }

    const options = {
        method : 'POST',
        url,
        headers,
        data
    };

    try {
        const response = await axios.request(options);
        console.log(response.data.response);
        return response.data.response;
    } catch (err) {
        console.error("An error occured.\n", err.message);
        return err.message;
    }
}

module.exports = generalQA;