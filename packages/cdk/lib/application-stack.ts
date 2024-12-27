import { Construct } from 'constructs';
import {Bucket} from "aws-cdk-lib/aws-s3";
import {Stack, StackProps} from "aws-cdk-lib";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export interface ApplicationStackProps extends StackProps {
  readonly stackName: string;
}

export class ApplicationStack extends Stack {
  constructor(scope: Construct, id: string, props: ApplicationStackProps) {
    super(scope, id, props);
    new Bucket(this, 'DummyTestBucket', {
      bucketName: `doggersdog-dummy-test-bucket-${props.stackName.toLowerCase()}`
    });
  }
}
