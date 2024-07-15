# Whatbot 🤖

## Greetings from Whatbot -- Your personal WhatsApp chatbot!! 👋

Whatbot is a WhatsApp chatbot that can:
* Sends sample messages
* Answers general questions
* Answers questions regarding a specific/multiple PDF file(s)
* Generate images based on your descriptions

## What does Whatbot use for its services? 🤔

<span style="font-size: 18px;"> **Whatbot** is divided into **two** main components:

### 1. The WhatsApp Chat Agent

* **Responsibilities**: Handles receiving and sending messages in WhatsApp.
* **Technology Stack**: Uses the Wassenger API.

### 2. The LLM Agent

* **Responsibilities**:
    * Sends sample messages.
    * Answers general questions.
    * Answers questions based on the context of a PDF(s).
    * Generates images based on your description.

* **Technology Stack**:
    * **Sample Messages:** Uses hardcoded data formatted according to Wassenger's API documentation. 
    * **General Questions:** Powered by Ollama's Llama3 model running locally.
    * **PDF Questions:** 
        * Uses Langchain's library methods according to the RAG (Retrieval-Augmented Generation) method.
        * Leverages Ollama's Llama3 model running locally to provide contextually accurate answers.
    * **Image Generation:** Uses the Stable Diffusion API.

## How does Whatbot function? 🤓

<span style="font-size: 18px;"> Whatbot's services are divided into **six** different **states**

### Note: - 
Each state has the following:
* **help** command tells the user the purpose of the current state
* **cancel** command takes the user back to the state they came from

### State 0 -- Oblivious
* In this state the bot is inactive so the sender can communicate with you without any unnecessary interruption.
* The bot is activated by its name i.e. **Whatbot**.
* The sender will receive a different message depending on whether it's their first interaction with the bot.

### State 1 -- Introduction
* The user is given a menu of actions to choose from. The bot performs the corresponding action to the number sent to it.
* The action menu is as follows:
    1. Receive Samples 😁
    2. Personal Chatbot 🤖
    3. PDF Chatbot 📄
    4. Image Generation Chatbot 📷
    5. Prompt History 📃

### State 2 -- Sample Messages
* The user is given a menu of samples to choose from. The bot then sends the corresponding sample to the sender.
* The sample menu is as follows:
    1. Quote 📝
    2. Image 📷
    3. Audio 🔉
    4. Video 📽
    5. Emoji 😀
    6. PDF Document 📄
    7. Contact 📞
    8. Location 👇

### State 3 -- General Q/A
* The user sends any questions that they might have.
* The messages are transferred to the LLM agent/
* The agent asks the locally running Ollama LLama3 model to get the answer.
* The response is sent back to the sender.

### State 4 -- PDF Q/A
* The agent does the following to every PDF received from the sender:
    1. It fetches the PDF from Wassenger's PDF message object
    2. It extracts the text from it using pdf-parser library
    3. Divide the text into chunks using the Langchain library
    4. Creates each chunk's embedding using Ollama embeddings for the model llama3 using the Langchain library
    5. Stores them in the pinecone vector database
* The agent does the following for every question received from the sender:
    1. Creates Ollama llama3 embeddings of the question using Langchain library
    2. Retrieves the chunks with the highest cosine similarity
    3. If no chunks contain relevant information then it asks the locally running Ollama's llama3 model for the answer
    4. When it gets the answer it sends it back to the sender

### State 5 -- Image Generation
* The agent does the following for every image generation request:
    1. It extracts the image's descriptions sent by the user
    2. Creates a request body according to Stable Disffusion's API documentation
    3. Sends an Axios request
    4. Receives the array of images and then sends them as individual messages back to the sender

### State 6 -- Prompt History
* In each of the states 3, 4, and 5 the prompt was being stored in MongoDB with the tag of it being either NP, GP, PP, IP as NonPrompt, GeneralPrompt, PdfPrompt, and ImagePrompt respectively.
* The bot displays all the various kinds of prompts the user has requested in an organized message format which is sent back to the sender

## Prerequisites 😬

<span style="font-size: 18px;"> You need to make sure you have entered the correct details in your ```config.js``` file before you run the project

* ```apikey: 'Wassenger_API_Key'```
    1. Log in to [Wassenger](https://www.wassenger.com/?do=login)
    2. Choose a subscription plan
    3. Go to the developer's icon on the homepage

* ```deviceID: 'Wassenger_Connected_Device_ID'```
    1. On Wassenger's homepage select your device out of all the connected devices
    2. The device details section contains the device ID

* ```ngrokTunnel: 'NGROK_Auth_Token'```
    1. Go to [Ngrok](https://ngrok.com/)'s official website
    2. SignUp on the website
    3. Download Ngrok for your device
    4. Go to account details to get the NGROK auth token

* ```webhookURL: 'Webhook_URL'```
    1. Your exposed port's webhook URL will come here

* ```pineconeAPI: "Pinecone_API_Key"```
    1. SignUp to [Pinecone](https://www.pinecone.io/)
    2. Go to your account settings to get the API key

*  ```collectionName: "collection_name"```
    1. This is the name of the collection where all your vector embeddings will be stored in Pinecone

* ```sdAPI: "StableDiffusion_API_Key"```
    1. SignUp to [Stable Diffusion](https://stablediffusionweb.com/auth/signup)
    2. Choose a subscription according to your needs
    3. Go to your account settings to get the API key 

## How to run the bot? 🤩

<span style="font-size: 18px;"> Follow the steps **in order** to run the bot
1. Complete ```config.js``` file
2. Expose your port using Ngrok using the command ```ngrok http 4000```
3. Copy the Ngrok link to your config file
4. Connect your device to Wassenger after signing up
5. Create a webhook on Wassenger that detects ```message:in:new``` events and use the Ngrok webhook url here in the format ```ngrok_webhook_url/webhook```
6. Open two instances of the terminal.
    * Run ```bot.js``` on the first one
    * Run ```agent.js``` on the second one
7. Refresh the Wassenger webhook if it shuts down (this happens a lot)
8. Send messages to the connected device and watch the bot in action 

## Demo Video!! 🎥

