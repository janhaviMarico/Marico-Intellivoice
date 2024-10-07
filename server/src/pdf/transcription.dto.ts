export interface ItranscriptionDto {
    tgname?: string;  // Optional because it will be generated on create
    tgid: string;
    audiodata: string[];
    summary: string;
    sentiment_analysis?: string;  // Optional with default value 'read'
    combinedTranslation:string;
  }