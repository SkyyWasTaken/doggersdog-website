import {ALBEvent, ALBHandler, ALBResult, Callback, Context} from "aws-lambda";
import process from "node:process";
import * as S3 from '@aws-sdk/client-s3'


export const handler: (event: ALBEvent, context: Context, callback: Callback<ALBResult>) => Promise<void> = async (event: ALBEvent, context: Context, callback: Callback<ALBResult>) => {
    const bucket = process.env.BUCKET;
    let key = event.path.replace('/', '');

    if (key == '') {
        key = 'index.html'
    }

    const command = new S3.GetObjectCommand({Bucket: bucket, Key: key})
    const client = new S3.S3Client()
    const res = await client.send(command).then(async (data): Promise<ALBResult> => {
        let encoding: BufferEncoding = 'utf8'
        let isBase64Encoded = false;
        if (data.ContentType?.includes('image/')) {
            isBase64Encoded = true;
            encoding = 'base64'
        }
        const requestBody = data.Body
        let statusCode = 500
        let statusDescription = '500 Internal Server Error'
        let body = undefined
        const headers = {
            "Content-Type": "application/octet-stream"
        }
        let contentType = ""
        if (requestBody === undefined) {
            statusCode = 404
            statusDescription ='404 Not found'
        } else {
            const bytes = await requestBody.transformToByteArray()
            statusCode = 200
            statusDescription = '200 OK'
            body = Buffer.from(bytes).toString(encoding)
            contentType = data.ContentType ?? ""
            headers['Content-Type'] = contentType
        }
        return {
            statusCode: statusCode,
            statusDescription: statusDescription,
            body: body,
            isBase64Encoded: isBase64Encoded,
            headers: headers
        }
    }).catch(err => {return err})
    console.log(`RESULT: ${JSON.stringify(res, null, 2).substring(0, 1000)}`)
    callback(null, res)
}
