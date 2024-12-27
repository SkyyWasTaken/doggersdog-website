#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import {DoggersDogPipelineStack} from "../lib/pipeline-stack";
import {ACCOUNTS, PIPELINE_ACCOUNT, PIPELINE_REGION, REGION} from "../lib/constants";
import {ApplicationStage} from "../lib/application-stage";

const app = new cdk.App();

const pipelineStack = new DoggersDogPipelineStack(app, 'DoggersDogPipelineStack', {
    env: {
        account: PIPELINE_ACCOUNT,
        region: PIPELINE_REGION
    }
});

// Add beta
pipelineStack.pipeline.addStage(new ApplicationStage(app, {
    env: {
        account: ACCOUNTS.beta,
        region: REGION
    },
}, 'Beta'))

// Add prod
pipelineStack.pipeline.addStage(new ApplicationStage(app, {
    env: {
        account: ACCOUNTS.prod,
        region: REGION
    },
}, 'Prod'))

app.synth();