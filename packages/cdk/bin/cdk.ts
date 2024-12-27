#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ApplicationStack } from '../lib/application-stack';
import {DoggersDogPipelineStack} from "../lib/pipeline-stack";
import {PIPELINE_ACCOUNT, PIPELINE_REGION} from "../lib/constants";

const app = new cdk.App();

new DoggersDogPipelineStack(app, 'DoggersDogPipelineStack', {
    env: {
        account: PIPELINE_ACCOUNT,
        region: PIPELINE_REGION
    }
});

app.synth();