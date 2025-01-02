import {ALBEvent, ALBHandler, ALBResult, Callback, Context} from "aws-lambda";
import process from "node:process";
import * as S3 from '@aws-sdk/client-s3'


export const handler: ALBHandler = async (event: ALBEvent, context: Context, callback: Callback<ALBResult>) => {
    const bucket = process.env.BUCKET;
    let key = event.path.replace('/', '');

    if (key == '') {
        key = 'index.html'
    }

    const command = new S3.GetObjectCommand({Bucket: bucket, Key: key})
    const client = new S3.S3Client()
    const res = await client.send(command).then(async (data) => {
        let encoding: BufferEncoding = 'utf8'
        let isBase64Encoded = false;
        if (data.ContentType?.includes('image/')) {
            isBase64Encoded = true;
            encoding = 'base64'
        }
        const body = data.Body
        if (body === undefined) {
            return {
                statusCode: 404,
                body: 'Not found'
            }
        } else {
            const bytes = await body.transformToByteArray()
            return {
                statusCode: 200,
                body: Buffer.from(bytes).toString(encoding),
                isBase64Encoded: isBase64Encoded,
            }
        }
    }).catch(err => {return err})
    console.log(`RESULT: ${JSON.stringify(res, null, 2).substring(0, 1000)}`)
    callback(null, res)
    return res

}
