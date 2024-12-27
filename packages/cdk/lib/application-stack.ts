import { Construct } from 'constructs';
import {Stack, StackProps} from "aws-cdk-lib";
import {CrossAccountZoneDelegationRecord, PublicHostedZone} from "aws-cdk-lib/aws-route53";
import {ACCOUNTS, DOMAIN_DELEGATED, PROD_ZONE_NAME} from "./constants";
import {ApplicationStackProps} from "./props";
import {AccountPrincipal, PolicyDocument, PolicyStatement, Role} from "aws-cdk-lib/aws-iam";

export class ApplicationStack extends Stack {
  public readonly hostedZone: PublicHostedZone;
  constructor(scope: Construct, id: string, props: StackProps, appProps: ApplicationStackProps) {
    super(scope, id, props);

    let zoneName = `${appProps.stageName.toLowerCase()}.doggers.dog`

    if (props.env?.account == ACCOUNTS.prod) {
      zoneName = "doggers.dog"
    }

    this.hostedZone = new PublicHostedZone(this, 'DoggersDogHostedZone', {
      zoneName: zoneName,
      caaAmazon: true,
    })

    const roleName = `DoggersDogDelegationRole-Prod`

    // If this is prod, we need to delegate to hosted zones in each stage
    if (props.env?.account == ACCOUNTS.prod) {
      const betaPrincipal = new AccountPrincipal(ACCOUNTS.beta)
      new Role(this, roleName, {
        assumedBy: betaPrincipal,
        inlinePolicies: {
          delegation: new PolicyDocument({
            statements: [
              new PolicyStatement({
                actions: ['route53:ChangeResourceRecordSets'],
                resources: [this.hostedZone.hostedZoneArn],
              }),
              new PolicyStatement({
                actions: ['route53:ListHostedZonesByName'],
                resources: ['*'],
              }),
            ]
          })
        },
        roleName: roleName,
      })
      this.hostedZone.grantDelegation(betaPrincipal)
    } else {
      this.registerPrimaryZone(this, roleName, appProps.stageName)
    }
  }

  registerPrimaryZone(scope: Construct, roleName: string, stage_name: string) {
    const roleArn = Stack.of(scope).formatArn({
      region: '',
      service: 'iam',
      resource: 'role',
      account: ACCOUNTS.prod,
      resourceName: roleName,
    })
    const delegationRole = Role.fromRoleArn(this, `${stage_name}HostedZoneDelegation`, roleArn)
    new CrossAccountZoneDelegationRecord(this, `${this.hostedZone.zoneName}Record`, {
      delegationRole: delegationRole,
      delegatedZone: this.hostedZone,
      parentHostedZoneName: PROD_ZONE_NAME,
    })
  }
}