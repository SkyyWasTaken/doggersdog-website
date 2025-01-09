import {aws_route53, Duration, RemovalPolicy, Stack, StackProps} from "aws-cdk-lib";
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
import {CfnWebACL} from "aws-cdk-lib/aws-wafv2";
import {
    AllowedMethods,
    Distribution,
} from "aws-cdk-lib/aws-cloudfront";
import {Certificate, CertificateValidation} from "aws-cdk-lib/aws-certificatemanager";
import {S3BucketOrigin, S3StaticWebsiteOrigin} from "aws-cdk-lib/aws-cloudfront-origins";
import {CloudFrontTarget} from "aws-cdk-lib/aws-route53-targets";
import {BucketDeployment, Source} from "aws-cdk-lib/aws-s3-deployment";

export class ApplicationStack extends Stack {
    constructor(scope: Construct, id: string, props: StackProps, stageName: string) {
        super(scope, id, props);
        const isProd = props.env?.account === ACCOUNTS.prod
        const domainName = isProd ? PROD_ZONE_NAME : `${stageName.toLowerCase()}.${PROD_ZONE_NAME}`
        const route_53 = new Route53Construct(this, 'Route53Construct', stageName, isProd, domainName)
        const site_infra = new SiteInfrastructureConstruct(this, 'SiteInfrastructureConstruct', route_53.certificate, domainName)
        route_53.register_cloudfront_target(site_infra.cloudfrontTarget)
    }
}

class SiteInfrastructureConstruct extends Construct {
    public readonly cloudfrontTarget: CloudFrontTarget;
    constructor(scope: Construct, id: string, certificate: Certificate, domainName: string) {
        super(scope, id);

        // Create the bucket
        const assetBucketLoggingBucket: Bucket = new Bucket(this, "assetAccessLogs", {
            autoDeleteObjects: true,
            encryption: BucketEncryption.S3_MANAGED,
            removalPolicy: RemovalPolicy.DESTROY,
            blockPublicAccess: {
                blockPublicAcls: true,
                blockPublicPolicy: true,
                ignorePublicAcls: true,
                restrictPublicBuckets: true
            },
            lifecycleRules: [
                {
                    expiration: Duration.days(1),
                }
            ]
        });

        // Create the bucket
        const assetBucket: Bucket = new Bucket(this, "WebsiteBucket", {
            autoDeleteObjects: true,
            encryption: BucketEncryption.S3_MANAGED,
            removalPolicy: RemovalPolicy.DESTROY,
            blockPublicAccess: {
                blockPublicAcls: true,
                blockPublicPolicy: true,
                ignorePublicAcls: true,
                restrictPublicBuckets: true
            },
            serverAccessLogsBucket: assetBucketLoggingBucket
        });

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
        const cloudfrontDistribution = new Distribution(this, "websiteDistribution", {
            defaultBehavior: {
                origin: S3BucketOrigin.withOriginAccessControl(assetBucket),
                allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
            },
            defaultRootObject: "index.html",
            domainNames: [domainName],
            certificate: certificate,
            webAclId: webAccessControlList.attrArn,
        })
        const deployment = new BucketDeployment(this, "WebsiteDeploymentBucketV2", {
            destinationBucket: assetBucket,
            // distribution: cloudfrontDistribution,
            sources: [Source.asset("../../website", {
            })]
        })
        this.cloudfrontTarget = new CloudFrontTarget(cloudfrontDistribution)
    }
}

class Route53Construct extends Construct {
    private readonly hostedZone: PublicHostedZone;
    public readonly certificate: Certificate;
    constructor(scope: Construct, id: string, stageName: string, isProd: boolean, domainName: string) {
        super(scope, id);

        this.hostedZone = new PublicHostedZone(this, 'DoggersDogHostedZone', {
            zoneName: domainName,
            caaAmazon: true,
        })

        this.certificate = new Certificate(this, 'DoggersDogCertificate', {
            domainName: domainName,
            validation: CertificateValidation.fromDns(this.hostedZone)
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
                target: RecordTarget.fromIpAddresses(MINECRAFT_SERVER_IP),
                recordName: "mc"
            })
        }
    }

    public register_cloudfront_target(cloudfrontTarget: CloudFrontTarget) {
        new aws_route53.ARecord(this, 'CloudfrontARecord', {
            zone: this.hostedZone,
            target: aws_route53.RecordTarget.fromAlias(cloudfrontTarget),
        })
    }
}