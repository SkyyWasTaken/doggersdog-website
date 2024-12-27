import {Stack, StackProps} from "aws-cdk-lib";
import {CrossAccountZoneDelegationRecord, HostedZone, PublicHostedZone} from "aws-cdk-lib/aws-route53";
import {ACCOUNTS, DOMAIN_DELEGATED, PROD_ZONE_NAME} from "./constants";
import {AccountPrincipal, PolicyDocument, PolicyStatement, Role} from "aws-cdk-lib/aws-iam";
import {Construct} from "constructs";

export class ApplicationStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps, stageName: string) {
    super(scope, id, props);

    new Route53Construct(this, 'Route53Construct',  stageName, props.env?.account === ACCOUNTS.prod)

  }
}

class Route53Construct extends Construct {
  private readonly hostedZone: PublicHostedZone;
  constructor(scope: Construct, id: string, stageName: string, isProd: boolean) {
        super(scope, id);
    const zoneName = isProd ? PROD_ZONE_NAME : `${stageName.toLowerCase()}.${PROD_ZONE_NAME}`

    this.hostedZone = new PublicHostedZone(this, 'DoggersDogHostedZone', {
      zoneName: zoneName,
      caaAmazon: true,
    })

    // Delegate to the beta stage
    const roleName = 'DoggersDogDelegationRole'
    if (isProd) {
      this.createDelegation(roleName)
    } else if (DOMAIN_DELEGATED) {
      this.registerDelegationRecord(this, roleName)
    }
  }

  private createDelegation(roleName: string) {
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
  }

  private registerDelegationRecord(scope: Construct, roleName: string) {
    const roleArn = Stack.of(scope).formatArn({
      region: '',
      service: 'iam',
      resource: 'role',
      account: ACCOUNTS.prod,
      resourceName: roleName,
    })
    const delegationRole = Role.fromRoleArn(this, `DoggersDogHostedZoneDelegationRole`, roleArn)
    new CrossAccountZoneDelegationRecord(this, `${this.hostedZone.zoneName}Record`, {
      delegationRole: delegationRole,
      delegatedZone: this.hostedZone,
      parentHostedZoneName: PROD_ZONE_NAME,
    })
  }
}