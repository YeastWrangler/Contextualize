#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AwsStack } from '../lib/aws-stack';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as ec2Instance from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPattern from 'aws-cdk-lib/aws-ecs-patterns';


const app = new cdk.App();


const stack = new cdk.Stack(app, 'FlaskWebAppStack', {

  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

  
});


const vpc = new ec2Instance.Vpc(stack, 'FlaskWebAppVPC', {
  maxAzs: 2,
});

const ecsCluster = new ecs.Cluster(stack, 'FlaskWebAppCluster', {
  vpc,
});

const redisCluster = new elasticache.CfnCacheCluster(stack, 'RedisCluster', {
  cacheNodeType: 'cache.m3.medium',
  engine: 'redis',
  numCacheNodes: 1,
  vpcSecurityGroupIds: [vpc.vpcDefaultSecurityGroup]
  
});

const flaskAppImage = ecs.ContainerImage.fromRegistry('FLASK_IMAGE');

const flaskAppService = new ecsPattern.ApplicationLoadBalancedFargateService(stack, 'FlaskAppService', {
  cluster: ecsCluster,
  taskImageOptions: {
    image: flaskAppImage,
  },
  publicLoadBalancer: true,
  desiredCount: 2,
});

const nginxProxyTaskDef = new ecs.FargateTaskDefinition(stack, 'NginxProxyTask');

const nginxContainer = nginxProxyTaskDef.addContainer('nginx-proxy', {
  image: ecs.ContainerImage.fromRegistry('nginx'),
  portMappings: [{ containerPort: 80 }],
});

const nginxProxyService = new ecs.FargateService(stack, 'NginxProxyService', {
  cluster: ecsCluster,
  taskDefinition: nginxProxyTaskDef,
  desiredCount: 1,
});

app.synth();
