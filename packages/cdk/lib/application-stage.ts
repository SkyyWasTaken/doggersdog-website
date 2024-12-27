import {Stage, StageProps} from "aws-cdk-lib";
import {ApplicationStack} from "./application-stack";
import {ApplicationStackProps} from "./props";

export class ApplicationStage extends Stage {
    constructor(scope: any, props: StageProps, appProps: ApplicationStackProps) {
        super(scope, `${appProps.stageName}ApplicationStage`, props);
        new ApplicationStack(this, `${appProps.stageName}ApplicationStack`, {
            env: props.env,
        }, appProps);
    }
}