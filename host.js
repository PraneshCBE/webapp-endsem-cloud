const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require("child_process");
    const AWS = require("aws-sdk");
    AWS.config.update({
      accessKeyId: "ASIAQKT2CDD6X73UC2OT",
      secretAccessKey: "QQblMW70fjhkiJleZIQhHz/HTDLnSh05sVUqYGaw",
      sessionToken:
        "FwoGZXIvYXdzECQaDB3ouR62dvtvbEqBTSK6AQwXlGHH2eGNH4exliQSqLeCjzuPOiu8/GrMTiLYeNjMMk33xqINOUXpZmOYK5K4ZVx620o8+ctPBaj0Evd6bapCCw+ZGFY4re+uyuF5h70S5kYAqfohPTLBSpkSA3FSc6YTP8S25PZFBZ2aucgyFfuYcGj7+D7GeZ12HuWVRmjCsObR7gQeIXnD/+b+mpKZ17YxH4l/IRSeZJ2kSKgDjF/osLQOfsqx96PtgrvuIOVBMmtOXMQ/YFXnGyjvpa6sBjItZmSOOD5zyuZFlLnba7kahw0H4JVPZzgOC5XnMzrL0x2kV15pndVZzPx3VICB",
      region: "us-east-1", // Replace 'us-east-1' with your preferred AWS region
    });
    
const PORT = 8080;

async function createAWSRDS() {
  const RDS = new AWS.RDS();

  const params = {
    AllocatedStorage: 20,
    DBInstanceIdentifier: "new-db-for-backup",
    DBInstanceClass: "db.t3.micro",
    Engine: "mysql",
    MasterUsername: "root",
    MasterUserPassword: "12345678",
    BackupRetentionPeriod: 0,
    S3BucketName: "buck-for-snap",
    S3IngestionRoleArn: "arn:aws:iam::022804568317:role/LabRole",
    S3Prefix: "rds_snapshots/backup.sql",
    SourceEngine: "mysql",
    SourceEngineVersion: "8.0.20",
  };


  try {
    const restoreResponse = await RDS.restoreDBInstanceFromS3(params).promise();
    console.log("Restore process initiated:", restoreResponse);
    return {
      statusCode: 200,
      body: JSON.stringify("Restore process initiated"),
    };
  } catch (error) {
    console.error("Error restoring database:", error);
    return {
      statusCode: 500,
      body: JSON.stringify("Error restoring database"),
    };
  }
}
http.createServer((req, res) => {
  const filePath = path.join(__dirname, 'index.html');

  if (req.url === '/') {
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading index.html');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content, 'utf-8');
      }
    });
  }else if(req.url === '/backup'){
    
    const AWS_S3_BUCKET = "buck-for-snap";
    const backupFilePath = "./backup.sql"; // Set your desired backup file path
    
    const backupCommand = `mysqldump -u root -p1234567 -h 34.42.11.52 cloud > ${backupFilePath}`;
    
    console.log("Starting backup...");
    
    exec(backupCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return;
      }
      console.log(`Backup successful. File saved at ${backupFilePath}`);
      console.log("Uploading backup file to S3...");
    
      const s3 = new AWS.S3();
      const fileContent = fs.readFileSync(backupFilePath);
      const params = {
        Bucket: AWS_S3_BUCKET,
        Key: "rds_snapshots/backup.sql",
        Body: fileContent,
      };
      s3.upload(params, (err, data) => {
        if (err) {
          console.error("Error uploading backup file to S3:", err);
        } else {
          console.log("Backup file uploaded successfully to S3:", data.Location);
        }
      });
    });
  } 
  else if(req.url === '/restore'){
    createAWSRDS();
  }
  
  else{
    res.writeHead(404);
    res.end('Page not found');
  }
}).listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
