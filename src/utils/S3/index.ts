import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    region: process.env.AWS_REGION!,
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;

interface FileType {
    originalname: string;
    buffer: Buffer;
    mimetype: string;
}

export const uploadImageToS3 = async (file: FileType): Promise<string> => {
    const fileExt = path.extname(file.originalname);
    const key = `bounties/media/${uuidv4()}${fileExt}`;

    const params: AWS.S3.PutObjectRequest = {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
    };

    await s3.upload(params).promise();

    return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};

export const deleteImageFromS3 = async (imageUrl: string): Promise<void> => {
    const url = new URL(imageUrl);
    const key = decodeURIComponent(url.pathname.substring(1));

    const params: AWS.S3.DeleteObjectRequest = {
        Bucket: BUCKET_NAME,
        Key: key,
    };

    await s3.deleteObject(params).promise();
};
