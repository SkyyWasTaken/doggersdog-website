import {Stage, StageProps} from "aws-cdk-lib";
import {ApplicationStack} from "./application-stack";

export class ApplicationStage extends Stage {
    constructor(scope: any, props: StageProps, stageName: string) {
        super(scope, `${stageName}ApplicationStage`, props);
        new ApplicationStack(this, `${stageName}ApplicationStack`, {
            env: props.env,
        }, stageName);
    }
}