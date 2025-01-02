import {
    ALBEvent,
    ALBHandler, ALBResult, Callback,
    Context
} from "aws-lambda";
import process from "node:process";
import S3 from '@aws-sdk/client-s3'


export const handler: ALBHandler = async (event: ALBEvent, context: Context, callback: Callback<ALBResult>) => {
    const bucket = process.env.BUCKET;
    let key = event.path.replace('/', '');

    if (key == '') {
        key = 'index.html'
    }

    const s3 = new S3.S3();
    return s3.getObject({Bucket: bucket, Key: key}).then(async (data) => {
        let encoding: BufferEncoding = 'utf8'
        let isBase64Encoded = false;
        if (data.ContentType?.includes('image/')) {
            isBase64Encoded = true;
            encoding = 'base64'
        }
        const body = data.Body
        if (body === undefined) {
            callback(null, {
                statusCode: 404,
                body: 'Not found'
            })
            return
        }
        const bytes = await body.transformToByteArray()
        callback(null, {
            statusCode: 200,
            body: Buffer.from(bytes).toString(encoding),
            isBase64Encoded: isBase64Encoded,
        })
    }).catch(err => {return err})
}