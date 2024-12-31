# DoggersDog's Website (WIP! Do not use!)

This is my site, currently a WIP. Doesn't actually deploy a website, only parts of the infrastructure required.

Will be built with AWS CDK and React

## Initial Setup (WIP)

This project is designed to be usable as a template site. After cloning:

1. Replace all instances of DoggersDog with your own project name
2. Update all project info in `packages/cdk/lib/constants.ts` and `package.json` (hosted zone name should be your 
domain)
3. Create two AWS accounts, one for the beta stage and one for the prod stage. Create an IAM user in each account 
with administrator access, adding an access token, and noting the token name and secret)
4. Run `npm run build` to ensure your system is correctly set up for development
5. Run `aws configure` to set the access key and secret on your beta account. All other fields can be left blank.
6. `cd ./packages/cdk`
7. `cdk bootstrap aws://<beta account ID>/<desired region>`
8. `aws configure` with your prod credentials
9. `cdk bootstrap aws://<prod account id>/us-east-1 --trust <beta account ID> --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess`
10. Set `DOMAIN_DELEGATED` to false `constants.ts`
11. `cd ../..`
12. `npm run cdk deploy`
13. If successful, remove your two IAM users to keep the accounts clean and secure
14. In your beta AWS account, navigate to Secrets Manager and set a GitHub oauth token. The token should have read 
permissions on your repo and should be able to create a webhook for pushes
15. Commit and push your code
16. Wait for your code to fully run through the code pipeline
17. Set `DOMAIN_DELEGATED` to true in `constants.ts`
18. Push your changes and wait for your code to go live
19. Head to your Route53 hosted zone in your prod account and update your DNS servers with your registrar to your AWS 
DNS servers
20. profit

instructions WIP