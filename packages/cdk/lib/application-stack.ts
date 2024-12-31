import {RemovalPolicy, Stack, StackProps} from "aws-cdk-lib";
import {
  ARecord,
  CrossAccountZoneDelegationRecord,
  PublicHostedZone,
  RecordTarget,
  TxtRecord
} from "aws-cdk-lib/aws-route53";
import {ACCOUNTS, BLUESKY_VERIFICATION_TXT, DOMAIN_DELEGATED, MINECRAFT_SERVER_IP, PROD_ZONE_NAME} from "./constants";
import {AccountPrincipal, PolicyDocument, PolicyStatement, Role} from "aws-cdk-lib/aws-iam";
import {Construct} from "constructs";
import {Bucket, BucketEncryption} from "aws-cdk-lib/aws-s3";
import {IpAddresses, Vpc} from "aws-cdk-lib/aws-ec2";
import {CfnWebACL} from "aws-cdk-lib/aws-wafv2";

export class ApplicationStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps, stageName: string) {
    super(scope, id, props);

    new Route53Construct(this, 'Route53Construct',  stageName, props.env?.account === ACCOUNTS.prod)

  }
}

class SiteInfrastructureConstruct extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Create the bucket
    const assetBucket: Bucket = new Bucket(this, "WebsiteBucket", {
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY
    });

    const vpc = new Vpc(this, "WebsiteVPC", {
      ipAddresses: IpAddresses.cidr("10.0.0.0/16"),
    })

    const webAccessControlList = new CfnWebACL(this, "WebACL", {
      name: "WebACL",
      defaultAction: {
        allow: {}
      },
      scope: "CLOUDFRONT",
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: "WebACL",
        sampledRequestsEnabled: true
      }
    })
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
        this.createProdRecords()
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

    private createProdRecords() {
      // @ts-ignore
      if (BLUESKY_VERIFICATION_TXT !== "") {
        new TxtRecord(this, 'BlueskyRecord', {
          zone: this.hostedZone,
          recordName: '_atproto',
          values: [BLUESKY_VERIFICATION_TXT],
        })
      }

      // @ts-ignore
      if (MINECRAFT_SERVER_IP !== "") {
        new ARecord(this, 'MinecraftServerARecord', {
          zone: this.hostedZone,
          target: RecordTarget.fromIpAddresses(MINECRAFT_SERVER_IP)
        })
      }
  }
}