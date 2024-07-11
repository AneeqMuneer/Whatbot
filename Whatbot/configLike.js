module.exports = {
    apikey: 'Wassenger_API_Key', // your wassenger product api key here
    deviceID: 'Wassenger_Connected_Device_ID', // can be found after connecting your wassenger product
    wassengerLink: "https://api.wassenger.com", // wassenger default link
    port: 4000, // your chosen port here on which the node.js server will run
    webhookURL: 'Webhook_URL', // your ngrok created link for your exposed port here
    ngrokTunnel: 'NGROK_Auth_Token', // sign up on ngrok to get the auth token
    production: true, // false if want to create an ngrok tunnel otherwise true
    agentPort: 3000, // your chosen port on which the LLM model will run
    ollamaPort: 11434, // default ollama running port
    ollamaLink: "http://localhost:11434/api/generate", // ollama's link where it answers to prompts locally
    agentLink: "http://localhost:3000", // my agent's access link
    mongoLocal: "mongodb://localhost:27017", // local mongodb server link
    collectionName: "collection_name", // your Index name where the user messages will be saved
    pineconeAPI: "Pinecone_API_Key", // pinecone api key
    sdAPI: "StableDiffusion_API_Key", // stable diffusion api key
    sdUrl : 'https://modelslab.com/api/v6/realtime/text2img' // stable diffusion's default text2img generation link
}