import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';
import {Secret} from "aws-cdk-lib/aws-secretsmanager";

export class DoggersDogPipelineStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        new Secret(this, 'GithubToken', {
            secretName: 'github-token'
        })

        new CodePipeline(this, 'Pipeline', {
            pipelineName: 'DoggersDogPipeline',
            synth: new ShellStep('Synth', {
                input: CodePipelineSource.gitHub('SkyyWasTaken/doggersdog-website', 'main'),
                commands: ['npm ci', 'npm run build']
            })
        });
    }
}