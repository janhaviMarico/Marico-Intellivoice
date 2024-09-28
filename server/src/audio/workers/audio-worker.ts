import { Container, CosmosClient } from "@azure/cosmos";
import { Translate } from "@google-cloud/translate/build/src/v2";
import axios from 'axios';
import { ConfigService } from '@nestjs/config';


const configService = new ConfigService();
const apiKey = configService.get<string>('TRANSALATION_APIKEY');
const endpoint=configService.get<string>('COSMOS_DB_ENDPOINT');
const key =configService.get<string>('COSMOS_DB_KEY')
const translateClient = new Translate({ key: apiKey });

const client = new CosmosClient({
  endpoint: endpoint,
  key: key
});

const database = client.database('marico-gpt');
const transcriptionContainer = database.container('Transcription');
  //  const axios = require('axios');

// Listen for the 'message' event to receive data from the parent process
process.on('message', async (audioProcessDtoArray) => {
  console.log('Worker received audio process data:', audioProcessDtoArray);

  try {
    // Transcribe audio files in parallel using Promise.all
    const transcriptionResults = await transcribeAudio(audioProcessDtoArray);

    // Send the transcription results back to the parent process
    process.send(transcriptionResults);

    // Exit the worker process once all tasks are complete
    process.exit();
  } catch (error) {
    console.error('Error in audio transcription worker:', error.message);
    // Send the error back to the parent process
    process.send({ error: error.message });
    // Exit with a failure code
    process.exit(1);
  }
});

/**
 * Function to handle multiple audio transcriptions
 */
async function transcribeAudio(audioProcessDtoArray) {
  try {
    // Map through the array of audio data, transcribing each audio file
    const transcriptionPromises = audioProcessDtoArray.map(async (audioData) => {
      const { TGName, sasToken, mainLang, SecondaryLang, noOfSpek } = audioData;

      console.log(`Starting transcription for TG: ${TGName}`);

      // Call the transcribe function for each audio file
      const transcriptionResult = await transcribe(
        TGName,          // Project name (TGName)
        sasToken,        // SAS URL
        mainLang,        // Main language
        SecondaryLang,   // Other languages
        noOfSpek         // Number of speakers
      );

      // Return the transcription result along with the TG name
      return { TGName, transcriptionResult };
    });

    // Wait for all transcriptions to complete
    const transcriptionResults = await Promise.all(transcriptionPromises);

    // Return the results of all transcriptions
    return transcriptionResults;
  } catch (error) {
    console.error('Error in transcribing audio array:', error.message);
    throw new Error('Audio transcription failed.');
  }
}

/**
 * Function to transcribe a single audio file using Azure Cognitive Services
 */
async function transcribe(
  project_name,      // The name of the project or Target Group (TG)
  sas_url,           // The SAS URL of the audio file
  main_language,     // The main language of the audio
  other_languages,   // Other languages (if applicable)
  number_of_speakers // Number of speakers in the audio
) {
  console.log('Inside function transcibe',project_name,other_languages);
  try {
    const SUBSCRIPTION_KEY = configService.get<string>('SUBSCRIPTION_KEY'); // Replace with your Azure subscription key
    const SERVICE_REGION = configService.get<string>('SERVICE_REGION'); // Adjust region based on your Azure region

    const language_dict = {
      English: 'en-IN',
      Hindi: 'hi-IN',
      Tamil: 'ta-IN',
      Telugu: 'te-IN',
      Marathi: 'mr-IN',
      Kannada: 'kn-IN',
      Malayalam: 'ml-IN',
      Gujarati: 'gu-IN'
    };

    // Determine the main language locale for Azure
    const LOCALE = language_dict[main_language];
    console.log(LOCALE);
    const all_languages = [LOCALE, ...other_languages.map((lang) => language_dict[lang])];
    console.log(all_languages);

    const apiUrl = `https://${SERVICE_REGION}.api.cognitive.microsoft.com/speechtotext/v3.1/transcriptions`;
    console.log('apiurl',apiUrl)
    const headers = {
      'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
      'Content-Type': 'application/json',
    };

    const transcriptionRequest = {
      contentUrls: [sas_url],
      properties: {
        diarizationEnabled: true,
        speakers: number_of_speakers,
        candidateLocales: all_languages,
        punctuationMode: 'DictatedAndAutomatic',
        profanityFilterMode: 'Removed',
      },
      locale: LOCALE,
      displayName: project_name,
      description: `Transcription for ${project_name}`,
    };

    // Start the transcription process
    console.log(`Start of transcription process ${project_name} with ID: ${project_name}`);
    const response = await axios.post(apiUrl, transcriptionRequest, { headers });
    console.log('Waiting for response from transcriptionRequest')

    const transcriptionUrl = response.headers['location']; // Get the URL to check transcription status
    const transcriptionId = transcriptionUrl.split('/').pop(); // Extract transcription ID

    console.log(`Transcription started for ${project_name} with ID: ${transcriptionId}`);

    // Poll the status of the transcription until it is complete
    return await getTranscriptionResult(transcriptionUrl, headers,project_name);

  } catch (error) {
    console.error(`Error starting transcription for ${project_name}:`, error.message);
    throw new Error(`Transcription failed for ${project_name}.`);
  }
}

/**
 * Polling function to check the transcription result status
 */
async function getTranscriptionResult(transcriptionUrl, headers,project_name:string) {
  let isCompleted = false;
  let transcriptionData;

  while (!isCompleted) {
    try {
      // Check transcription status
      const statusResponse = await axios.get(transcriptionUrl, { headers });
      transcriptionData = statusResponse.data;

      if (transcriptionData.status === 'Succeeded') {
        isCompleted = true;
        console.log('Transcription succeeded.');
      } else if (transcriptionData.status === 'Failed') {
        throw new Error('Transcription failed.');
      }
      else {
        console.log(`Transcription status: ${transcriptionData.status}. Retrying...`);
        await sleep(30000); // Wait for 30 seconds before c
      }
    } catch (error) {
    console.error('Error polling transcription status:', error.message);
    throw new Error('Error polling transcription status.');
  }
  }

// Retrieve the transcription result
      const filesUrl = transcriptionData.links.files;
    const resultResponse = await axios.get(filesUrl, { headers });
    const transcriptionContentUrl = resultResponse.data.values.find(
      (file: any) => file.kind === 'Transcription'
    ).links.contentUrl;
    console.log('transcriptionContentUrl',transcriptionContentUrl);

  const transcriptionResult = await axios.get(transcriptionContentUrl);
  const recognizedPhrases = transcriptionResult.data.recognizedPhrases;
const audioDataArray = await Promise.all(recognizedPhrases.map(async item => {
  const displayText = item.nBest && item.nBest[0] ? item.nBest[0].display : '';
  const convTime = item.offset.replace('PT', '').toLowerCase().split('.')[0] + 's';
  try {
    const translatedText = await translateText(displayText)
  return {
      speaker: item.speaker,
      timestamp: convertToTimeFormat(convTime),
      transcription: displayText,
      translation: translatedText
  };
  }catch (translateError) {
  console.error('Translation Error:', translateError.message);
  throw new Error('Translation failed.');
  }
}));

const transcriptionDocument={
  TGId: project_name,
  audiodata:audioDataArray
}
//console.log(transcriptionDocument.audiodata);
const response =await saveTranscriptionDocument(transcriptionDocument);
console.log('Transcription document inserted',response)
return transcriptionDocument;
}

async function saveTranscriptionDocument(transcriptionDocument) {
  try {
    // Attempt to insert the document
    const response = await transcriptionContainer.items.create(transcriptionDocument);
    console.log('Transcription document inserted:', response.resource);  // Log the response from Cosmos DB
    // Check if the document was successfully inserted
    if (response.resource) {
      console.log('Document successfully created in Cosmos DB');
    } else {
      console.error('Document was not inserted successfully');
    }
    return transcriptionDocument;
  } catch (error) {
    // Log any errors that occurred during the insertion
    console.error('Error inserting document into Cosmos DB:', error.message);
    throw new Error('Failed to insert transcription document.');
  }
}

async function translateText(transcribedText: string) {
  try {
    // Extract only the translated text from the response
    const [translatedText] = await translateClient.translate(transcribedText, 'en');
    // Return only the translated text
    console.log('console.log(translatedText)',translatedText);
    return translatedText;
  } catch (error) {
    console.error('Translation error:', error);
    throw new Error('Failed to translate text');
  }
}
/**  
* Utility function to wait for a specified amount of time (sleep)
*/
function sleep(ms) {
return new Promise((resolve) => setTimeout(resolve, ms));
}

function convertToTimeFormat1(timeStr: any): string {
  const hours = Math.floor(timeStr / 3600);
  const minutes = Math.floor((timeStr % 3600) / 60);
  const seconds = timeStr % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}`;
}

  function convertToTimeFormat(timeStr) {
    let hours = 0, minutes = 0, seconds = 0;

    // Removing 'PT' and splitting based on 'h', 'm', 's'
    if (timeStr.includes('h')) {
        hours = parseInt(timeStr.split('h')[0].replace('PT', ''));
        timeStr = timeStr.split('h')[1];
    }
    if (timeStr.includes('m')) {
        minutes = parseInt(timeStr.split('m')[0]);
        timeStr = timeStr.split('m')[1];
    }
    if (timeStr.includes('s')) {
        seconds = parseInt(timeStr.split('s')[0]);
    }

    // Formatting hours, minutes, seconds to 2 digits
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
