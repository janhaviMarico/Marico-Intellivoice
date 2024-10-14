import { Injectable, OnModuleInit } from '@nestjs/common';
import { CosmosClient } from '@azure/cosmos';
import nodemailer from 'nodemailer';

@Injectable()
export class ChangeFeedService implements OnModuleInit {
  private client: CosmosClient;
  private container: any;

  constructor() {
    this.client = new CosmosClient({ endpoint: 'https://marico-gpt-db.documents.azure.com:443/', key: 'A8sHzgvKfrrARuSNHYY3B6nbVzqt8AgVTI7GXfMXXon0t8JUApe8ASy4NE7FrU8VndKv8Jqx82DHACDbHltAZA==' });
    this.container = this.client.database('marico-gpt').container('Transcription');
  }

  async onModuleInit() {
    await this.listenToChangeFeed();
  }

//   private async listenToChangeFeed() {
//     const query = 'SELECT * FROM c';
//     const changeFeedIterator = this.container.items.query(query);

//     while (true) {
//       const { resources: changes } = await changeFeedIterator.fetchNext();
//       if (changes.length > 0) {
//         for (const change of changes) {
//           await this.sendEmail(change);
//         }
//       }
//       // Add a delay to avoid overwhelming the DB
//       await new Promise(resolve => setTimeout(resolve, 5000));
//     }
//   }
// private async listenToChangeFeed() {
//     const partitionKeyValues = await this.getDistinctPartitionKeys();
//     //console.log('Found partition keys:', partitionKeyValues);
  
//     const iterators = partitionKeyValues.map(keyValue => 
//       this.container.items.changeFeed({ partitionKey: keyValue })
//     );
  
//     while (true) {
//       for (const changeFeedIterator of iterators) {
//         try {
//           const response = await changeFeedIterator.fetchNext();
//          // console.log('Change feed response:', response); // Log the response
  
//           const changes = response.resources;
  
//           if (changes && Array.isArray(changes) && changes.length > 0) {
//             for (const change of changes) {
//               await this.sendEmail(change);
//             }
//           } else {
//             //console.log('No changes detected.');
//           }
//         } catch (error) {
//          // console.error('Error fetching changes:', error);
//         }
//       }
//       await new Promise(resolve => setTimeout(resolve, 5000));
//     }
//   }


  // private async getDistinctPartitionKeys(): Promise<string[]> {
  //   const query = 'SELECT * FROM c'; // Adjust based on your partition key field
  //   const { resources } = await this.container.items.query(query).fetchAll();
  //   const keys = resources.map(item => item.tgid); // Adjust to extract the partition key correctly
  //   console.log("key is",resources)
  //   console.log('Distinct partition keys:',); // Log the keys
  //   return keys;
  // }


  private async listenToChangeFeed() {
    try {
      // Fetch the change feed without any partition key
      const changeFeedIterator = this.container.items.changeFeed(); 
      
      while (true) {
        // Fetch changes
        const { resources: changes } = await changeFeedIterator.fetchNext();

        if (changes.length > 0) {
          console.log('Changes detected:', changes);
          for (const change of changes) {
            await this.sendEmail(change); // Send email for each change
          }
        }
        // Add a delay to avoid overwhelming the DB
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error) {
      console.error('Error in Change Feed:', error);
    }
  }

  // private async getDistinctPartitionKeys(): Promise<string[]> {
  //   const query = 'SELECT DISTINCT c.TGId FROM c';
  //   const { resources } = await this.container.items.query(query).fetchAll();
  //   const keys = resources.map(item => item.TGId);
  //   console.log("TGIds are", resources);
  //   console.log('Distinct TGIds:', keys);
  //   return keys;
  // }

  
  
  private async sendEmail(change: any) {
    const transporter = nodemailer.createTransport({
      service: 'gmail', // or any other service
      auth: {
        user: 'akanksha.jadhav@atriina.com',
        pass: 'hymv zmve eyyx clpo',
      },
    });

    const mailOptions = {
      from: 'akanksha.jadhav@atriina.com',
      to: 'akankshajadhav1317@gmail.com',
      subject: 'Change Feed Notification',
      text: `A change has occurred: ${JSON.stringify(change)}`,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('Email sent successfully.');
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }
}
