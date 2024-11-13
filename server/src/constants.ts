import { text } from "stream/consumers";

export const SUMMARIZATION_PROMPT_TEMPLATE = (summaryLength: number, text: string) => `
  You are an expert summarizer. Your task is to summarize the following text.
  Aim for a summary that is approximately ${summaryLength} words long.
  Incorporate main ideas and essential information by eliminating extraneous language and focusing on critical aspects.
  Identify all the topics or aspects and create a proper and precise conclusion from the discussion.
  Put the clear summary; do not put unconcluded thoughts in the answer.
  
  Here is the text to summarize:
  ${text}
  
  Provide a summary based on the given guidelines.
`;

// export const SENTIMENT_ANALYSIS_PROMPT=(text:string) => `
// You are an expert in sentiment analysis. Given multiple sentiment analysis, your task is to 
// combine them into a cohesive sentiment analysis for each speaker. Be precise the do not provide 
// mixed result give only positive and negative into result, also calculate a NPS score depends on the 
// speakers positive and negative points and provide it at speaker level and at overall level.
// Provide a overall sentiment and them give a breakdown of speaker level sentiment analysis of the
// product feedback  with proper explanation.
                            
// Here are the text to combine:
// ${text}
                              
// Sentiment Analysis & NPS Score: 
// `;

export const SENTIMENT_ANALYSIS_PROMPT=(text:string) => `
You are an expert in sentiment analysis. Given multiple sentiment summaries, your task is to
                            combine them into a cohesive sentiment analysis.
                            
                            List out all the positive, negative and neutral sentiments with proper explanation.
                            Also provide an overall sentiment of the sentiment and analysis with reason of the sentiment.
                            
                            
                            Context: {context}
 
                            Here are the text to combine:
                            ${text}
 
                            Based on these, create a comprehensive sentiment analysis and provide breakdown of positive, negative and neutral sentiments with reasons.
                            If there are conflicting sentiments, indicate the dominant sentiment and provide an explanation.
                            In case of conflicts answer proper which of sentiment can be considered.
`;

export const SUMMARY="Summary";
export const SENTIMENT_ANALYSIS="SA";

export const PROJECT_COMPARE=(text:string)=> `Analyze and compare the customer feedback for two FMCG products based on the following aspects.
            Use the provided audio file names and their respective transcripts as context for the analysis:

            Context:
            ${text}

            Aspects to Analyze:
            Sentiment Distribution: What is the ratio of positive, negative, and neutral feedback for both products based on the transcripts?
            Key Themes and Topics: Identify common and unique feedback themes for each product, using insights from the provided transcripts.
            Feature-Specific Feedback: Compare the feedback on the functionality, performance, and innovation of both products as reflected in the transcripts.
            Brand Perception: How do customers perceive the brand trust, loyalty, and sustainability of each product according to the transcripts?
            Pricing and Value for Money: Compare customer opinions on the affordability and value proposition for both products based on the transcript data.
            Customer Experience: Evaluate customer feedback on ease of use and customer support mentioned in the transcripts.
            Loyalty and Advocacy: Compare the Net Promoter Score (NPS) and likelihood of repurchase for each product as described in the transcripts.
            Demographic Insights: Are there differences in feedback based on demographics or geography in the transcripts?
            Product Differentiators: Identify the unique selling points (USPs) and competitive advantages mentioned in the transcripts.
            Packaging and Presentation: Compare how customers view the packaging quality, design, and sustainability for both products, as reflected in the transcripts.
            Quality and Durability: Evaluate customer feedback on product quality, longevity, and any defects as mentioned in the transcripts.
            Availability and Distribution: Are there any mentions of ease of access, stock availability, or supply chain issues in the transcripts?


            Provide a detailed comparison between the two products based on these points, using the transcripts for supporting insights.
`

export const STATIC_INSTRUCTION=`
Analyze and compare the customer feedback for two FMCG products based on the following aspects.
            Use the provided audio file names and their respective transcripts as context for the analysis:

            Aspects to Analyze:
            Sentiment Distribution: What is the ratio of positive, negative, and neutral feedback for both products based on the transcripts?
            Key Themes and Topics: Identify common and unique feedback themes for each product, using insights from the provided transcripts.
            Feature-Specific Feedback: Compare the feedback on the functionality, performance, and innovation of both products as reflected in the transcripts.
            Brand Perception: How do customers perceive the brand trust, loyalty, and sustainability of each product according to the transcripts?
            Pricing and Value for Money: Compare customer opinions on the affordability and value proposition for both products based on the transcript data.
            Customer Experience: Evaluate customer feedback on ease of use and customer support mentioned in the transcripts.
            Loyalty and Advocacy: Compare the Net Promoter Score (NPS) and likelihood of repurchase for each product as described in the transcripts.
            Demographic Insights: Are there differences in feedback based on demographics or geography in the transcripts?
            Product Differentiators: Identify the unique selling points (USPs) and competitive advantages mentioned in the transcripts.
            Packaging and Presentation: Compare how customers view the packaging quality, design, and sustainability for both products, as reflected in the transcripts.
            Quality and Durability: Evaluate customer feedback on product quality, longevity, and any defects as mentioned in the transcripts.
            Availability and Distribution: Are there any mentions of ease of access, stock availability, or supply chain issues in the transcripts?
            Provide a detailed comparison between the two products based on these points, using the transcripts for supporting insights.


`