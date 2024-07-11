const config = require("../../config.js");
const axios = require("axios");
const PDFParser = require("pdf2json");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { Pinecone } = require("@pinecone-database/pinecone");

const { OllamaEmbeddings } = require("@langchain/community/embeddings/ollama");
const { Ollama } = require("@langchain/community/llms/ollama");
const { ChatPromptTemplate } = require("@langchain/core/prompts");


const pdfParser = new PDFParser();

let row;
let col;
let size;

const indexName = "whatbot-pdf-index";
let exists = false;

const pc = new Pinecone({
  apiKey: config.pineconeAPI
});

const fetchPDF = async (pdfUrl) => {
  try {
    const response = await axios.get(pdfUrl, {
      responseType: "arraybuffer",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
        "Authorization" : config.apikey
      },
    });

    console.log("PDF fetch successful");

    return new Promise((resolve, reject) => {
      pdfParser.on("pdfParser_dataReady", (pdfData) => {
        resolve(pdfData);
      });

      pdfParser.on("pdfParser_dataError", (errData) => {
        console.log("Text extraction failed");
        reject(errData.parserError);
      });

      pdfParser.parseBuffer(response.data);
    });
  } catch (err) {
    console.log("PDF fetch failed");
    console.error(err.message);
  }
};

const extractText = async (pdfData) => {
  let rawText = "";
  pdfData.Pages.forEach((page) => {
    page.Texts.forEach((text) => {
      text.R.forEach((t) => {
        rawText += decodeURIComponent(t.T) + " ";
      });
    });
    rawText += "\n";
  });
  console.log("Text extraction successful");
  return rawText;
}

const divText = async (data) => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  try {
    const chunks = await splitter.splitText(data);
    console.log("Chunks created successfully");
    return chunks;
  } catch (err) {
    console.log("An error occured while creating the chunks.");
    console.error(err.message);
  }
};

const embed = async (chunks) => {

  const embeddings = new OllamaEmbeddings({
    model : "llama3",
    baseUrl : "http://localhost:11434"
  });

  try {
    const embedded = await embeddings.embedDocuments(chunks);
    console.log("Embeddings created successfully");
    if (embedded.length > 0 && embedded[0].length > 0) {
      row = embedded.length;
      col = embedded[0].length;
      size = row * col;
      console.log("row : " , row , " col : " , col , " size : " , size);
    } else {
      console.log("Failed to determine the embedding size.");
    }
    return embedded;
  } catch (err) {
    console.log("An error occured while creating the embeddings.");
    console.error(err.message);
  }
};

const getIndex = async () => {
  try {
    let indexes = await pc.listIndexes();
    let indexList = "";
    let index;

    indexes.indexes.forEach(index => {
      indexList += index.name + "\n";
    });

    if (indexList.includes(indexName)) {
      console.log(`Index ${indexName} already exists`);
      index = pc.index(indexName);
    } else {
      console.log(`Creating index ${indexName}...`);
      index = await pc.createIndex({
        name: indexName,
        dimension: 4096,
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      });
      console.log(`Index ${indexName} created successfully`);
    }
    return index;
  } catch (err) {
    console.log(`An error occured while creating the index\n`, err.message);
  }
}

const vecStore = async (msgID, senderNum, pdfUrl, pdfName, embeddings, chunks) => {
  const index = await getIndex();

  try {
    const iterator = row;
    console.log(`${iterator} records will be created`);

    const segments = pdfName.split(/\./);
    pdfName = segments[0].toLowerCase();

    for (let i = 0; i < iterator; i++) {
      const record = [
        {
          id: `${pdfName}_PART_${i + 1}`,
          values: embeddings[i],
          metadata: {
            number: senderNum,
            msgID,
            pdfUrl,
            text: chunks[i],
            part: i + 1,
            total: iterator,
            name: `${pdfName}-${i + 1}`
          }
        }
      ]
      await index.upsert(record);
      console.log(`record ${record[0].metadata.part} out of ${record[0].metadata.total} uploaded`);
    }
  } catch (uploadErr) {
    console.error("An error occured while uplaoding the indexes.\n", uploadErr.message);
  }
};

const getAns = async (question) => {
  console.log("Asking the agent");

  const index = await getIndex();

  const embeddings = new OllamaEmbeddings({
    model : "llama3",
    baseUrl : "http://localhost:11434"
  });

  const questionEmbedding = await embeddings.embedQuery(question);
  
  let context = "";
  const records = await index.listPaginated();
  const recordCount = records.vectors.length;

  if (recordCount) {
    const relatedDocs = await index.query({
      topK: 5,
      vector: questionEmbedding,
      includeValues: true,
      includeMetadata: true,
    });
  
    context = relatedDocs.matches.map((match) => match.metadata.text).join("\n\n");
  }

  const llm = new Ollama({
    model : "llama3",
    baseUrl : "http://localhost:11434"
  });

  const lifeMotto = ChatPromptTemplate.fromTemplate(
    `Answer the user's question based on the given context. If there is no context or you are unable to find answer from the context then ask Ollma's llamam3 model.
    
    Context : {context}
    Question : {question}`
  );

  const chain = lifeMotto.pipe(llm);

  const response = await chain.invoke({
    context,
    question
  });

  console.log(response);
  return response;
};

const delAllIndex = async () => {
  let indexes = await pc.listIndexes();
  indexes.indexes.forEach(async index => {
    await pc.deleteIndex(index.name);
  });
  console.log("All indexes deleted successfully");
}

const pdfStore = async (pdfUrl , pdfName , msgID , senderNum) => {
  console.log("In pdfStore");

  // fetch the pdf
  const pdfData = await fetchPDF(pdfUrl);
  
  // extract the text from the pdf
  const content = await extractText(pdfData);

  // split text into relevant chunks
  const chunks = await divText(content);

  // create the embeddings
  let embedded = await embed(chunks);

  // store the embeddings in the vector database
  await vecStore(msgID, senderNum, pdfUrl, pdfName, embedded, chunks);

  // delAllIndex();
};

const pdfQA = async (question) => {
  console.log("In pdfQA")

  // get the answer to the question
  const answer = await getAns(question);

  return answer;
}

module.exports = {pdfStore , pdfQA};