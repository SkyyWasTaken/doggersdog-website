import {Environment, Stage, StageProps} from "aws-cdk-lib";
import {ApplicationStack} from "./application-stack";

export interface ApplicationStageProps extends StageProps {
    readonly env: Environment;
    readonly appStageName: string;
}

export class ApplicationStage extends Stage {
    constructor(scope: any, props: ApplicationStageProps) {
        super(scope, `${props.appStageName}ApplicationStage`, props);
        new ApplicationStack(this, `${props.appStageName}ApplicationStack`, {
            env: props.env,
            stackName: props.appStageName
        });
    }
}