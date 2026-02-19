#!/bin/bash
# ============================================================
# Terraform Import Script for Muvi Production AWS Infrastructure
# ============================================================
# 
# This script imports ALL existing AWS resources into the new
# Terraform state. Run from the terraform/ directory.
#
# PREREQUISITES:
#   1. terraform init
#   2. AWS credentials configured for profile muvi-prod
#   3. Run: export AWS_PROFILE=muvi-prod AWS_REGION=eu-central-1
#
# IMPORTANT:
#   - The old state used "module.aws-prod.*" addresses.
#   - This new config uses FLAT resource addresses.
#   - You MUST start from a fresh state (or remove old state).
#   - Run terraform init -reconfigure to start fresh.
#
# USAGE:
#   chmod +x import.sh
#   ./import.sh 2>&1 | tee import.log
# ============================================================

set -e  # Exit on first error (comment out to continue on errors)

REGION="eu-central-1"
ACCOUNT="011566070219"

echo "============================================"
echo "Starting Terraform Import — $(date)"
echo "============================================"

# ==================== VPC ====================
echo "--- VPC ---"
terraform import aws_vpc.main vpc-078c1286f49e3383e

# ==================== SUBNETS ====================
echo "--- Subnets ---"
# Public subnets (index 0=a, 1=b, 2=c)
terraform import 'aws_subnet.public[0]' subnet-04009f842250f8375
terraform import 'aws_subnet.public[1]' subnet-036ca19262e4d4f1a
terraform import 'aws_subnet.public[2]' subnet-037c958cfdc279ac6

# Nated subnets
terraform import 'aws_subnet.nated[0]' subnet-036873c374e922b83
terraform import 'aws_subnet.nated[1]' subnet-07d8f8c1c6c80dea8
terraform import 'aws_subnet.nated[2]' subnet-0333f09a9fc72b047

# Private subnets
terraform import 'aws_subnet.private[0]' subnet-0597676a17d61126e
terraform import 'aws_subnet.private[1]' subnet-08dbd60bee0ce3c0f
terraform import 'aws_subnet.private[2]' subnet-037decb47fda29484

# ==================== IGW, NAT, EIP ====================
echo "--- IGW, NAT, EIP ---"
terraform import aws_internet_gateway.main igw-0333662de5c94c110
terraform import aws_eip.nat eipalloc-06b78f30d02ee7a7f
terraform import aws_nat_gateway.main nat-084762c0476c4fe74

# ==================== ROUTE TABLES ====================
echo "--- Route Tables ---"
terraform import aws_route_table.public rtb-04d962c95280c48a0
terraform import aws_route_table.nated rtb-06c62746dc2d5fd95
terraform import aws_route_table.private rtb-07b7b09f06ae659b0

# Route table associations (subnet_id is the import ID)
terraform import 'aws_route_table_association.public[0]' subnet-04009f842250f8375
terraform import 'aws_route_table_association.public[1]' subnet-036ca19262e4d4f1a
terraform import 'aws_route_table_association.public[2]' subnet-037c958cfdc279ac6
terraform import 'aws_route_table_association.nated[0]' subnet-036873c374e922b83
terraform import 'aws_route_table_association.nated[1]' subnet-07d8f8c1c6c80dea8
terraform import 'aws_route_table_association.nated[2]' subnet-0333f09a9fc72b047
terraform import 'aws_route_table_association.private[0]' subnet-0597676a17d61126e
terraform import 'aws_route_table_association.private[1]' subnet-08dbd60bee0ce3c0f
terraform import 'aws_route_table_association.private[2]' subnet-037decb47fda29484

# ==================== NACLs ====================
echo "--- NACLs ---"
terraform import aws_network_acl.public acl-0b963d937eb29e1c8
terraform import aws_network_acl.nated acl-0aadc97b768f28e4d
terraform import aws_network_acl.private acl-0f82aa0a155f74be2

# ==================== VPC ENDPOINTS ====================
echo "--- VPC Endpoints ---"
terraform import aws_vpc_endpoint.s3_gateway vpce-0bc70cd39d3b1e899
terraform import aws_vpc_endpoint.s3_interface vpce-0cf1cba68a66f96ee
terraform import aws_vpc_endpoint.s3_accesspoint vpce-098a676d05c7546fe
terraform import aws_vpc_endpoint.autoscaling vpce-017a4ec84a9e14a4f

# ==================== SECURITY GROUPS ====================
echo "--- Security Groups ---"
terraform import aws_security_group.vpc_endpoint sg-0f2b2b17c3fc5a79c
terraform import aws_security_group.alb_public sg-0396b04836d84509a
terraform import aws_security_group.alb_internal sg-045b4c351932e8c25
terraform import aws_security_group.alb_website sg-09da4fc382939793a

# ECS SGs
terraform import 'aws_security_group.ecs["gateway"]' sg-03400c50a0a0bc1f3
terraform import 'aws_security_group.ecs["identity"]' sg-03fa6c188b77443fe
terraform import 'aws_security_group.ecs["main"]' sg-0a11922ec65ca6f44
terraform import 'aws_security_group.ecs["payment"]' sg-094582c20ec72fe53
terraform import 'aws_security_group.ecs["fb"]' sg-06246059445a7b13c
terraform import 'aws_security_group.ecs["notification"]' sg-0fe157efb5f66865a
terraform import 'aws_security_group.ecs["offer"]' sg-085eaf7913a536bd8
terraform import 'aws_security_group.ecs["website"]' sg-024bff3995ec7c88f
terraform import 'aws_security_group.ecs["ticket"]' sg-08a1dda7c8222b78a

# RDS SGs
terraform import 'aws_security_group.rds["main"]' sg-0fb9af9d73a579b85
terraform import 'aws_security_group.rds["identity"]' sg-014c26dc02d1bcc0a
terraform import 'aws_security_group.rds["payment"]' sg-07a6cfc35385111e6
terraform import 'aws_security_group.rds["notification"]' sg-0864d40eb1a78fd03
terraform import 'aws_security_group.rds["fb"]' sg-0bdbd3522a5f7a4db
terraform import 'aws_security_group.rds["offer"]' sg-0e7860f5b993af40c

# Redis SGs
terraform import 'aws_security_group.redis["main"]' sg-0573647bc76fb5e99
terraform import 'aws_security_group.redis["shared"]' sg-0e0bf1d03ae415755
terraform import 'aws_security_group.redis["offer"]' sg-049fef80f20d91864
terraform import 'aws_security_group.redis["fb"]' sg-09ca5bcb34f7b6331
terraform import 'aws_security_group.redis["notification"]' sg-096f8fb7e81803784

# Proxy SGs
terraform import 'aws_security_group.proxy["main"]' sg-09217d529e871582f
terraform import 'aws_security_group.proxy["identity"]' sg-09207ac6e0dc4e71a
terraform import 'aws_security_group.proxy["payment"]' sg-084a6a96cc60f5a25
terraform import 'aws_security_group.proxy["fb"]' sg-0a964bd23c062387a
terraform import 'aws_security_group.proxy["notification"]' sg-00b378461de8dd42a
terraform import 'aws_security_group.proxy["offer"]' sg-0c704af4897167b6d

# Standalone SGs
terraform import aws_security_group.jumpbox sg-093aa4253ea56ee33
terraform import aws_security_group.db_migration sg-0ce9cc986a96fcc3f
terraform import aws_security_group.db_preparation sg-092822327258509f4

# ==================== KMS KEYS ====================
echo "--- KMS Keys ---"
terraform import aws_kms_key.rds 216f6e95-66a8-4640-9a1d-f6a266b3a751
terraform import aws_kms_alias.rds arn:aws:kms:${REGION}:${ACCOUNT}:alias/RDS-key
terraform import aws_kms_key.cloudtrail cd00b0cc-fa83-43f3-8174-2d5c037c96ad
terraform import aws_kms_alias.cloudtrail arn:aws:kms:${REGION}:${ACCOUNT}:alias/cloudtrail-key
terraform import aws_kms_key.va_scan 46dbecc3-7c13-4846-b350-bf981c8f035e
terraform import aws_kms_alias.va_scan arn:aws:kms:${REGION}:${ACCOUNT}:alias/va-scan-key

# ==================== ECR ====================
echo "--- ECR Repositories ---"
terraform import 'aws_ecr_repository.repos["muvi-gateway"]' muvi-gateway
terraform import 'aws_ecr_repository.repos["muvi-identity"]' muvi-identity
terraform import 'aws_ecr_repository.repos["muvi-main"]' muvi-main
terraform import 'aws_ecr_repository.repos["muvi-payment"]' muvi-payment
terraform import 'aws_ecr_repository.repos["muvi-notification"]' muvi-notification
terraform import 'aws_ecr_repository.repos["muvi-fb"]' muvi-fb
terraform import 'aws_ecr_repository.repos["muvi-offer"]' muvi-offer
terraform import 'aws_ecr_repository.repos["muvi-website"]' muvi-website

# ==================== RDS SUBNET GROUPS ====================
echo "--- RDS Subnet Groups ---"
terraform import aws_db_subnet_group.main muvi-prod-subnetg
terraform import aws_db_subnet_group.identity muvi-prod0identity-service-subnetg
terraform import aws_db_subnet_group.payment muvi-prod-payment-service-subnetg
terraform import aws_db_subnet_group.notification muvi-prod-notification-service-subnetg
terraform import aws_db_subnet_group.order muvi-prod-order-service-subnetg

# ==================== RDS PARAMETER GROUPS ====================
echo "--- RDS Parameter Groups ---"
# Cluster parameter groups
terraform import 'aws_rds_cluster_parameter_group.services["main"]' muvi-prod-cluster-pg
terraform import 'aws_rds_cluster_parameter_group.services["identity"]' muvi-prod-identity-cluster-pg
terraform import 'aws_rds_cluster_parameter_group.services["payment"]' muvi-prod-payment-service-cluster-pg
terraform import 'aws_rds_cluster_parameter_group.services["notification"]' muvi-prod-notification-cluster-pg
terraform import 'aws_rds_cluster_parameter_group.services["fb"]' muvi-fb-cluster-pg
terraform import 'aws_rds_cluster_parameter_group.services["offer"]' muvi-offer-cluster-pg

# DB parameter groups
terraform import 'aws_db_parameter_group.services["main"]' muvi-prod-pg
terraform import 'aws_db_parameter_group.services["identity"]' muvi-prod-identity-pg
terraform import 'aws_db_parameter_group.services["payment"]' muvi-prod-payment-service-pg
terraform import 'aws_db_parameter_group.services["notification"]' muvi-prod-notification-pg

# ==================== RDS CLUSTERS ====================
echo "--- RDS Clusters ---"
terraform import aws_rds_cluster.main muvi-prod-main-service
terraform import aws_rds_cluster.identity muvi-prod-identity
terraform import aws_rds_cluster.payment muvi-prod-payments-recovered-cluster
terraform import aws_rds_cluster.notification muvi-prod-notification
terraform import aws_rds_cluster.fb muvi-prod-fb
terraform import aws_rds_cluster.offer muvi-offer-prod
terraform import aws_rds_cluster.migration prod-alldb-mig

# ==================== RDS INSTANCES ====================
echo "--- RDS Instances ---"
terraform import aws_rds_cluster_instance.main_writer muvi-prod-main-writer
terraform import aws_rds_cluster_instance.main_reader muvi-prod-main-reader
terraform import aws_rds_cluster_instance.identity_writer muvi-prod-identity-writer
terraform import aws_rds_cluster_instance.identity_reader muvi-prod-identity-reader
terraform import aws_rds_cluster_instance.payment_writer muvi-prod-payments-writer
terraform import aws_rds_cluster_instance.payment_reader muvi-prod-payment-reader
terraform import aws_rds_cluster_instance.notification_writer muvi-prod-notification-writer
terraform import aws_rds_cluster_instance.fb_writer muvi-prod-fb-writer
terraform import aws_rds_cluster_instance.fb_reader muvi-prod-fb-reader
terraform import aws_rds_cluster_instance.offer_writer muvi-prod-offer-writer
terraform import aws_rds_cluster_instance.offer_reader muvi-prod-offer-reader
terraform import aws_rds_cluster_instance.migration prod-alldb-mig-instance-1

# ==================== RDS PROXIES ====================
echo "--- RDS Proxies ---"
terraform import 'aws_db_proxy.proxies["main"]' main-proxy
terraform import 'aws_db_proxy.proxies["identity"]' identity-proxy
terraform import 'aws_db_proxy.proxies["payment"]' payment-proxy
terraform import 'aws_db_proxy.proxies["notification"]' notification-proxy
terraform import 'aws_db_proxy.proxies["fb"]' fb-proxy
terraform import 'aws_db_proxy.proxies["offer"]' offer-proxy

# Proxy default target groups
terraform import 'aws_db_proxy_default_target_group.proxies["main"]' main-proxy
terraform import 'aws_db_proxy_default_target_group.proxies["identity"]' identity-proxy
terraform import 'aws_db_proxy_default_target_group.proxies["payment"]' payment-proxy
terraform import 'aws_db_proxy_default_target_group.proxies["notification"]' notification-proxy
terraform import 'aws_db_proxy_default_target_group.proxies["fb"]' fb-proxy
terraform import 'aws_db_proxy_default_target_group.proxies["offer"]' offer-proxy

# Proxy targets
terraform import 'aws_db_proxy_target.proxies["main"]' main-proxy/default/CLUSTER/muvi-prod-main-service
terraform import 'aws_db_proxy_target.proxies["identity"]' identity-proxy/default/CLUSTER/muvi-prod-identity
terraform import 'aws_db_proxy_target.proxies["payment"]' payment-proxy/default/CLUSTER/muvi-prod-payments-recovered-cluster
terraform import 'aws_db_proxy_target.proxies["notification"]' notification-proxy/default/CLUSTER/muvi-prod-notification
terraform import 'aws_db_proxy_target.proxies["fb"]' fb-proxy/default/CLUSTER/muvi-prod-fb
terraform import 'aws_db_proxy_target.proxies["offer"]' offer-proxy/default/CLUSTER/muvi-offer-prod

# ==================== ELASTICACHE ====================
echo "--- ElastiCache ---"
terraform import aws_elasticache_replication_group.gateway foms-redis-prod-getway
terraform import aws_elasticache_replication_group.identity foms-redis-prod-identity
terraform import aws_elasticache_replication_group.main foms-redis-prod-main
terraform import aws_elasticache_replication_group.payment foms-redis-prod-paymnet
terraform import aws_elasticache_replication_group.notification foms-redis-prod-notification
terraform import aws_elasticache_replication_group.fb foms-redis-prod-fb
terraform import aws_elasticache_replication_group.offer foms-redis-prod-offer
terraform import aws_elasticache_replication_group.shared foms-redis-prod-shared
terraform import aws_elasticache_replication_group.bulk_refund foms-redis-prod-bulk-refund-booking

# ==================== ALBs ====================
echo "--- ALBs ---"
terraform import aws_lb.public arn:aws:elasticloadbalancing:${REGION}:${ACCOUNT}:loadbalancer/app/Muvi-Prod/c3cf4367f8150faf
terraform import aws_lb.internal arn:aws:elasticloadbalancing:${REGION}:${ACCOUNT}:loadbalancer/app/Muvi-Microservices-Prod/a43ce5ff1d3863cc
terraform import aws_lb.website arn:aws:elasticloadbalancing:${REGION}:${ACCOUNT}:loadbalancer/app/Muvi-Website-ALB/cfcc87a37414dd08

# ==================== TARGET GROUPS ====================
echo "--- Target Groups ---"
terraform import aws_lb_target_group.gateway arn:aws:elasticloadbalancing:${REGION}:${ACCOUNT}:targetgroup/muvi-gateway-tg/b8011e248b2b3cfe
terraform import aws_lb_target_group.website arn:aws:elasticloadbalancing:${REGION}:${ACCOUNT}:targetgroup/muvi-website-tg/72fabbe195cced14
terraform import aws_lb_target_group.ticket arn:aws:elasticloadbalancing:${REGION}:${ACCOUNT}:targetgroup/muvi-ticket-tg/88c12ac9109eea2b
terraform import 'aws_lb_target_group.grpc["identity"]' arn:aws:elasticloadbalancing:${REGION}:${ACCOUNT}:targetgroup/muvi-identity-tg/8ebf7533c99bb499
terraform import 'aws_lb_target_group.grpc["main"]' arn:aws:elasticloadbalancing:${REGION}:${ACCOUNT}:targetgroup/muvi-main-grpc/5aa2cbf6c1feba68
terraform import 'aws_lb_target_group.grpc["payment"]' arn:aws:elasticloadbalancing:${REGION}:${ACCOUNT}:targetgroup/muvi-payment-grpc/a32f401b302ecb11
terraform import 'aws_lb_target_group.grpc["notification"]' arn:aws:elasticloadbalancing:${REGION}:${ACCOUNT}:targetgroup/muvi-notification-grpc/f81f022d99151768
terraform import 'aws_lb_target_group.grpc["fb"]' arn:aws:elasticloadbalancing:${REGION}:${ACCOUNT}:targetgroup/muvi-fb-grpc-tg/c8c36c574363ed29
terraform import 'aws_lb_target_group.grpc["offer"]' arn:aws:elasticloadbalancing:${REGION}:${ACCOUNT}:targetgroup/muvi-offer-grpc/5072b48d9fcf1b32

# ==================== ALB LISTENERS ====================
echo "--- ALB Listeners ---"
# Public ALB HTTP listener
terraform import aws_lb_listener.public_http arn:aws:elasticloadbalancing:${REGION}:${ACCOUNT}:listener/app/Muvi-Prod/c3cf4367f8150faf/596f2f442864101d

# Website ALB HTTP listener
terraform import aws_lb_listener.website_http arn:aws:elasticloadbalancing:${REGION}:${ACCOUNT}:listener/app/Muvi-Website-ALB/cfcc87a37414dd08/e3480a3125b139d0

# Internal ALB gRPC listeners (ports 5002-5007)
terraform import 'aws_lb_listener.internal["main"]' arn:aws:elasticloadbalancing:${REGION}:${ACCOUNT}:listener/app/Muvi-Microservices-Prod/a43ce5ff1d3863cc/b827d3d90b7ea1e3
terraform import 'aws_lb_listener.internal["payment"]' arn:aws:elasticloadbalancing:${REGION}:${ACCOUNT}:listener/app/Muvi-Microservices-Prod/a43ce5ff1d3863cc/f23bc13acda0529e
terraform import 'aws_lb_listener.internal["fb"]' arn:aws:elasticloadbalancing:${REGION}:${ACCOUNT}:listener/app/Muvi-Microservices-Prod/a43ce5ff1d3863cc/361b28f3d79de1d8
terraform import 'aws_lb_listener.internal["notification"]' arn:aws:elasticloadbalancing:${REGION}:${ACCOUNT}:listener/app/Muvi-Microservices-Prod/a43ce5ff1d3863cc/02b8d4097ee6556f
terraform import 'aws_lb_listener.internal["offer"]' arn:aws:elasticloadbalancing:${REGION}:${ACCOUNT}:listener/app/Muvi-Microservices-Prod/a43ce5ff1d3863cc/7cc90c8b413aedb3
terraform import 'aws_lb_listener.internal["identity"]' arn:aws:elasticloadbalancing:${REGION}:${ACCOUNT}:listener/app/Muvi-Microservices-Prod/a43ce5ff1d3863cc/8d1f5785d75bc5bf

# ==================== ECS ====================
echo "--- ECS Cluster ---"
terraform import aws_ecs_cluster.production arn:aws:ecs:${REGION}:${ACCOUNT}:cluster/Muvi-Production

# ECS Task Definitions (import latest revision of each family)
echo "--- ECS Task Definitions ---"
terraform import 'aws_ecs_task_definition.services["gateway"]' muvi-gateway
terraform import 'aws_ecs_task_definition.services["identity"]' muvi-identity
terraform import 'aws_ecs_task_definition.services["main"]' muvi-main
terraform import 'aws_ecs_task_definition.services["payment"]' muvi-payment
terraform import 'aws_ecs_task_definition.services["notification"]' muvi-notification
terraform import 'aws_ecs_task_definition.services["fb"]' muvi-fb
terraform import 'aws_ecs_task_definition.services["offer"]' muvi-offer
terraform import 'aws_ecs_task_definition.services["website"]' muvi-website
terraform import 'aws_ecs_task_definition.services["ticket"]' muvi-ticket

# ECS Services
echo "--- ECS Services ---"
terraform import 'aws_ecs_service.services["gateway"]' Muvi-Production/gateway
terraform import 'aws_ecs_service.services["identity"]' Muvi-Production/identity-grpc
terraform import 'aws_ecs_service.services["main"]' Muvi-Production/main-grpc
terraform import 'aws_ecs_service.services["payment"]' Muvi-Production/payment-grpc
terraform import 'aws_ecs_service.services["notification"]' Muvi-Production/notification-grpc
terraform import 'aws_ecs_service.services["fb"]' Muvi-Production/fb-muvi
terraform import 'aws_ecs_service.services["offer"]' Muvi-Production/offer-muvi
terraform import 'aws_ecs_service.services["website"]' Muvi-Production/website
terraform import 'aws_ecs_service.services["ticket"]' Muvi-Production/ticket

# ==================== LAMBDA ====================
echo "--- Lambda Functions ---"
terraform import aws_lambda_function.sync_films sync-films-prod
terraform import aws_lambda_function.sync_person sync-person-prod
terraform import aws_lambda_function.sync_cinema sync-cinema-prod
terraform import aws_lambda_function.sync_genres sync-genres-prod
terraform import aws_lambda_function.sync_sessions sync-sessions-prod
terraform import aws_lambda_function.sync_concessions sync-concessions
terraform import aws_lambda_function.cancel_expired cron-cancel-expired-prod
terraform import aws_lambda_function.reminder cron-reminder-prod
terraform import aws_lambda_function.reminder_transaction cron-reminder-transaction
terraform import aws_lambda_function.check_stock cron-check-and-update-stock-status
terraform import aws_lambda_function.birthday birthday-notification-prod
terraform import aws_lambda_function.anniversary user-anniversary-prod
terraform import aws_lambda_function.survey cron-survey-prod
terraform import aws_lambda_function.survey_email survey-email-prod
terraform import aws_lambda_function.delete_notifications delete-old-notifications
terraform import aws_lambda_function.clean_orders clean-orders-production
terraform import aws_lambda_function.clean_sessions clean-sessions-production
terraform import aws_lambda_function.clear_orders_fb clear-orders-fb
terraform import aws_lambda_function.unpublished_films unpublished-old-films
terraform import aws_lambda_function.expired_cashback process-expired-cashback-transaction
terraform import aws_lambda_function.terminate_pending_sync terminate-pending-sync-process
terraform import aws_lambda_function.invalidate_cache InvalidateCache
terraform import aws_lambda_function.lambda_to_sf Lambda_to_stepfunction
terraform import aws_lambda_function.s3_to_blob S3_to_Blob
terraform import aws_lambda_function.ecs_scale_up ECS-main-grpc-tasks-SCALE_UP
terraform import aws_lambda_function.ecs_scale_down ECS-main-grpc-tasks-SCALE_DOWN
terraform import aws_lambda_function.rds_scale_out RDS-WeekEnd-ScaleOut
terraform import aws_lambda_function.rds_scale_in RDS-WeekEnd-Scale-in
terraform import aws_lambda_function.weekend_ecs_scaling weekend-ECSscaling
terraform import aws_lambda_function.ewallet_export ewallet-transactions-export
terraform import aws_lambda_function.event_test event-test
terraform import aws_lambda_function.datadog_api_1 DatadogIntegration-DatadogA-DatadogAPICallFunction-2YlA33W8VbBW
terraform import aws_lambda_function.datadog_api_2 DatadogIntegration-DatadogA-DatadogAPICallFunction-J8LkqJr7hAsR

# ==================== S3 BUCKETS ====================
echo "--- S3 Buckets ---"
terraform import 'aws_s3_bucket.buckets["alpha-zero-store"]' alpha-zero-store
terraform import 'aws_s3_bucket.buckets["aws-athena-query-results-eu-central-1-011566070219"]' aws-athena-query-results-eu-central-1-011566070219
terraform import 'aws_s3_bucket.buckets["aws-cloudtrail-logs-011566070219-95d0077e"]' aws-cloudtrail-logs-011566070219-95d0077e
terraform import 'aws_s3_bucket.buckets["aws-waf-logs-backend-acl"]' aws-waf-logs-backend-acl
terraform import 'aws_s3_bucket.buckets["aws-waf-logs-otp-acl"]' aws-waf-logs-otp-acl
terraform import 'aws_s3_bucket.buckets["awsdatasecurityscanlogs"]' awsdatasecurityscanlogs
terraform import 'aws_s3_bucket.buckets["bluepi-billing-cur2-7-011566070219-1757941014312"]' bluepi-billing-cur2-7-011566070219-1757941014312
terraform import 'aws_s3_bucket.buckets["cf-templates--9nyo4zgvsgwj-me-south-1"]' cf-templates--9nyo4zgvsgwj-me-south-1
terraform import 'aws_s3_bucket.buckets["cf-templates-1evx9rkccyvvq-eu-central-1"]' cf-templates-1evx9rkccyvvq-eu-central-1
terraform import 'aws_s3_bucket.buckets["cf-templates-1evx9rkccyvvq-eu-west-1"]' cf-templates-1evx9rkccyvvq-eu-west-1
terraform import 'aws_s3_bucket.buckets["codepipeline-eu-central-1-288456816626"]' codepipeline-eu-central-1-288456816626
terraform import 'aws_s3_bucket.buckets["codepipeline-cloudtrail-placeholder-bucket-eu-central-1"]' codepipeline-cloudtrail-placeholder-bucket-eu-central-1
terraform import 'aws_s3_bucket.buckets["config-bucket-011566070219"]' config-bucket-011566070219
terraform import 'aws_s3_bucket.buckets["gitlab-gateway-muvi"]' gitlab-gateway-muvi
terraform import 'aws_s3_bucket.buckets["gitlab-identity-muvi"]' gitlab-identity-muvi
terraform import 'aws_s3_bucket.buckets["gitlab-main-muvi"]' gitlab-main-muvi
terraform import 'aws_s3_bucket.buckets["gitlab-muvi-cms"]' gitlab-muvi-cms
terraform import 'aws_s3_bucket.buckets["gitlab-muvi-fb"]' gitlab-muvi-fb
terraform import 'aws_s3_bucket.buckets["gitlab-muvi-gateway"]' gitlab-muvi-gateway
terraform import 'aws_s3_bucket.buckets["gitlab-muvi-identity"]' gitlab-muvi-identity
terraform import 'aws_s3_bucket.buckets["gitlab-muvi-notification"]' gitlab-muvi-notification
terraform import 'aws_s3_bucket.buckets["gitlab-muvi-payment"]' gitlab-muvi-payment
terraform import 'aws_s3_bucket.buckets["gitlab-website-muvi"]' gitlab-website-muvi
terraform import 'aws_s3_bucket.buckets["muvi-alb-accesslogs"]' muvi-alb-accesslogs
terraform import 'aws_s3_bucket.buckets["muvi-athena"]' muvi-athena
terraform import 'aws_s3_bucket.buckets["muvi-cms-prod"]' muvi-cms-prod
terraform import 'aws_s3_bucket.buckets["muvi-cms-prod-dr"]' muvi-cms-prod-dr
terraform import 'aws_s3_bucket.buckets["muvi-datadog-archives"]' muvi-datadog-archives
terraform import 'aws_s3_bucket.buckets["muvi-media-prod"]' muvi-media-prod
terraform import 'aws_s3_bucket.buckets["muvi-media-prod-dr"]' muvi-media-prod-dr
terraform import 'aws_s3_bucket.buckets["muvi-menu-public"]' muvi-menu-public
terraform import 'aws_s3_bucket.buckets["muvi-microservices-load-balancer"]' muvi-microservices-load-balancer
terraform import 'aws_s3_bucket.buckets["muvi-microservices-prod-internal-alb-logs"]' muvi-microservices-prod-internal-alb-logs
terraform import 'aws_s3_bucket.buckets["muvi-prd-inspector-va-scan"]' muvi-prd-inspector-va-scan
terraform import 'aws_s3_bucket.buckets["muvi-replication-completion-reports"]' muvi-replication-completion-reports
terraform import 'aws_s3_bucket.buckets["securityaccesslogs-muvi-prod"]' securityaccesslogs-muvi-prod
terraform import 'aws_s3_bucket.buckets["terraform-statefile-muvi"]' terraform-statefile-muvi
terraform import 'aws_s3_bucket.buckets["tf-state-file-bkt"]' tf-state-file-bkt
terraform import 'aws_s3_bucket.buckets["waf-backend-acl-logs"]' waf-backend-acl-logs
terraform import 'aws_s3_bucket.buckets["muvi-prod-codepipeline-artifacts"]' muvi-prod-codepipeline-artifacts

# ==================== CLOUDFRONT ====================
echo "--- CloudFront ---"
terraform import aws_cloudfront_distribution.api E3R44XFXP7D4XA
terraform import aws_cloudfront_distribution.website E3D8M8DPJDRDJQ
terraform import aws_cloudfront_distribution.media E12XU0ZJSAUKT
terraform import aws_cloudfront_distribution.cms E2NFLAHKQPYK2C
terraform import aws_cloudfront_distribution.dashboard E33JEFJR1BGV0Y
terraform import aws_cloudfront_distribution.media_dr EWJVMHRCEN303
terraform import aws_cloudfront_distribution.cms_dr E2JSUR76FOMIUW
terraform import aws_cloudfront_distribution.app_dr E1X10DAU976MCH
terraform import aws_cloudfront_distribution.go_muvicinemas E1FS328G3HR7N

# CloudFront OAIs (get IDs from existing distributions)
# NOTE: OAI IDs need to be retrieved from CloudFront — use:
#   aws cloudfront list-cloud-front-origin-access-identities --query "CloudFrontOriginAccessIdentityList.Items[*].[Id,Comment]" --output text
# terraform import aws_cloudfront_origin_access_identity.oai_1 <OAI_ID_1>
# terraform import aws_cloudfront_origin_access_identity.oai_2 <OAI_ID_2>

# ==================== API GATEWAY ====================
echo "--- API Gateway ---"
terraform import aws_api_gateway_rest_api.main zsbpj86m2a
# Resources, methods, integrations need REST API sub-resource IDs
# terraform import aws_api_gateway_resource.proxy zsbpj86m2a/<resource_id>
# terraform import aws_api_gateway_deployment.main zsbpj86m2a/<deployment_id>

# ==================== WAF ====================
echo "--- WAF ---"
terraform import aws_wafv2_web_acl.otp_acl 5c303e02-afb7-4f96-9700-63e59d67af27/OTP-ACL/REGIONAL
# CloudFront WAF needs us-east-1 — get ID:
#   aws wafv2 list-web-acls --profile muvi-prod --region us-east-1 --scope CLOUDFRONT --query "WebACLs[*].[Id,Name]" --output text
# terraform import aws_wafv2_web_acl.backend_acl <ID>/Backend-ACL/CLOUDFRONT

# ==================== ACM ====================
echo "--- ACM Certificates ---"
terraform import aws_acm_certificate.internal arn:aws:acm:${REGION}:${ACCOUNT}:certificate/115fb4b0-b7eb-4138-88ec-52dde53fef31
terraform import aws_acm_certificate.cloudfront_prod arn:aws:acm:us-east-1:${ACCOUNT}:certificate/b6673333-7881-4d33-89d6-d9251c677a70
terraform import aws_acm_certificate.cloudfront_root arn:aws:acm:us-east-1:${ACCOUNT}:certificate/f3f9f234-bc4c-4825-95ce-3075893f7aae

# ==================== ROUTE53 ====================
echo "--- Route53 ---"
terraform import aws_route53_zone.public Z10403533MKYDXAOE9HLV
terraform import aws_route53_zone.internal_1 Z06126993IL9ZN6HBF9G1
terraform import aws_route53_zone.internal_2 Z05015832TQMHD5MTPU44
terraform import aws_route53_zone.microservices_1 Z06423211GSKHGZL5YOX0
terraform import aws_route53_zone.microservices_2 Z10239253816QBQDWXQHN

# ==================== SECRETS MANAGER ====================
echo "--- Secrets Manager ---"
terraform import 'aws_secretsmanager_secret.rds_secrets["main"]' arn:aws:secretsmanager:${REGION}:${ACCOUNT}:secret:prod/muvi/main/rds
terraform import 'aws_secretsmanager_secret.rds_secrets["identity"]' arn:aws:secretsmanager:${REGION}:${ACCOUNT}:secret:prod/muvi/identity/rds
terraform import 'aws_secretsmanager_secret.rds_secrets["payment"]' arn:aws:secretsmanager:${REGION}:${ACCOUNT}:secret:prod/muvi/payment/rds
terraform import 'aws_secretsmanager_secret.rds_secrets["notification"]' arn:aws:secretsmanager:${REGION}:${ACCOUNT}:secret:prod/muvi/notification/rds
terraform import 'aws_secretsmanager_secret.rds_secrets["fb"]' arn:aws:secretsmanager:${REGION}:${ACCOUNT}:secret:prod/muvi/fb/rds
terraform import aws_secretsmanager_secret.apple_merchant arn:aws:secretsmanager:${REGION}:${ACCOUNT}:secret:prod/muvi/apple-merchant-identity
terraform import aws_secretsmanager_secret.braze_api_key arn:aws:secretsmanager:${REGION}:${ACCOUNT}:secret:prod/muvi/braze/api-key
terraform import aws_secretsmanager_secret.offer_db arn:aws:secretsmanager:${REGION}:${ACCOUNT}:secret:prod/muvi/offer/db

# NOTE: The exact secret ARNs may have random suffixes — verify with:
#   aws secretsmanager list-secrets --profile muvi-prod --region eu-central-1

# ==================== SSM PARAMETERS ====================
echo "--- SSM Parameters ---"
# All SSM parameters under /production/ — import by name
# NOTE: These are for_each based, example pattern:
# terraform import 'aws_ssm_parameter.params["/production/PARAM_NAME"]' /production/PARAM_NAME
# Full list in ssm.tf — run the following loop:

SSM_PARAMS=(
  "/production/DB_HOST"
  "/production/DB_PASSWORD"
  "/production/DB_USER"
  "/production/IDENTITY_DB_HOST"
  "/production/IDENTITY_DB_PASSWORD"
  "/production/IDENTITY_DB_USER"
  "/production/PAYMENT_DB_HOST"
  "/production/PAYMENT_DB_PASSWORD"
  "/production/PAYMENT_DB_USER"
  "/production/NOTIFICATION_DB_HOST"
  "/production/NOTIFICATION_DB_PASSWORD"
  "/production/NOTIFICATION_DB_USER"
  "/production/FB_DB_HOST"
  "/production/FB_DB_PASSWORD"
  "/production/FB_DB_USER"
  "/production/REDIS_HOST"
  "/production/REDIS_PORT"
  "/production/IDENTITY_REDIS_HOST"
  "/production/PAYMENT_REDIS_HOST"
  "/production/NOTIFICATION_REDIS_HOST"
  "/production/FB_REDIS_HOST"
  "/production/OFFER_REDIS_HOST"
  "/production/SHARED_REDIS_HOST"
  "/production/JWT_SECRET"
  "/production/JWT_EXPIRY"
  "/production/VISTA_API_URL"
  "/production/VISTA_API_KEY"
  "/production/ONESIGNAL_APP_ID"
  "/production/ONESIGNAL_API_KEY"
  "/production/SENDGRID_API_KEY"
  "/production/UNIFONIC_APP_SID"
  "/production/UNIFONIC_SENDER_ID"
  "/production/TAQNYAT_API_KEY"
  "/production/TAQNYAT_SENDER_ID"
  "/production/HYPERPAY_ENTITY_ID"
  "/production/HYPERPAY_ACCESS_TOKEN"
  "/production/PAYFORT_MERCHANT_ID"
  "/production/PAYFORT_ACCESS_CODE"
  "/production/PAYFORT_SHA_REQUEST"
  "/production/PAYFORT_SHA_RESPONSE"
  "/production/CHECKOUT_SECRET_KEY"
  "/production/CHECKOUT_PUBLIC_KEY"
  "/production/TABBY_PUBLIC_KEY"
  "/production/TABBY_SECRET_KEY"
  "/production/TABBY_MERCHANT_CODE"
  "/production/AWS_S3_BUCKET"
  "/production/AWS_CLOUDFRONT_URL"
  "/production/BRAZE_API_KEY"
  "/production/BRAZE_REST_ENDPOINT"
  "/production/ZATCA_API_URL"
  "/production/ZATCA_API_KEY"
  "/production/ZATCA_API_SECRET"
  "/production/APPLE_PAY_MERCHANT_ID"
  "/production/NEARPAY_API_KEY"
  "/production/NEARPAY_API_URL"
  "/production/OFFER_DB_HOST"
  "/production/OFFER_DB_PORT"
)

for param in "${SSM_PARAMS[@]}"; do
  terraform import "aws_ssm_parameter.params[\"${param}\"]" "${param}" || echo "WARN: Failed to import ${param}"
done

# ==================== EVENTBRIDGE ====================
echo "--- EventBridge Rules ---"
# Vista sync rules
terraform import aws_cloudwatch_event_rule.sync_films sync-films-prod
terraform import aws_cloudwatch_event_rule.sync_person sync-person-prod
terraform import aws_cloudwatch_event_rule.sync_cinema sync-cinema-prod
terraform import aws_cloudwatch_event_rule.sync_genres sync-genres-prod
terraform import aws_cloudwatch_event_rule.sync_sessions sync-sessions-prod
terraform import aws_cloudwatch_event_rule.sync_sessions_midnight sync-sessions-midnight
terraform import aws_cloudwatch_event_rule.sync_concessions sync-concessions

# Business cron rules
terraform import aws_cloudwatch_event_rule.cancel_expired cron-cancel-expired-prod
terraform import aws_cloudwatch_event_rule.reminder reminder-order-cron
terraform import aws_cloudwatch_event_rule.reminder_transaction reminder-transaction-cron
terraform import aws_cloudwatch_event_rule.check_stock cron-check-stock-status

# Notification cron rules
terraform import aws_cloudwatch_event_rule.birthday birthday-notification-prod
terraform import aws_cloudwatch_event_rule.anniversary user-anniversary-prod
terraform import aws_cloudwatch_event_rule.survey survey-notification-prod
terraform import aws_cloudwatch_event_rule.survey_email survey-email-prod
terraform import aws_cloudwatch_event_rule.delete_notifications delete-old-notifications

# Cleanup cron rules
terraform import aws_cloudwatch_event_rule.clean_orders clean-orders-production
terraform import aws_cloudwatch_event_rule.clean_sessions clean-sessions-production
terraform import aws_cloudwatch_event_rule.clear_orders_fb clean-order-fb
terraform import aws_cloudwatch_event_rule.unpublished_films unpublished-old-films
terraform import aws_cloudwatch_event_rule.expired_cashback process-expired-cashback-transaction
terraform import aws_cloudwatch_event_rule.terminate_pending_sync terminate-pending-sync-process

# ==================== CLOUDTRAIL ====================
echo "--- CloudTrail ---"
terraform import aws_cloudtrail.management_events management-events
terraform import aws_cloudtrail.codepipeline_source codepipeline-source-trail
terraform import aws_cloudtrail.data_security_scan AWS_DataSecurity_Scan

# ==================== SNS ====================
echo "--- SNS ---"
terraform import aws_sns_topic.cloudtrail_logs arn:aws:sns:${REGION}:${ACCOUNT}:aws-cloudtrail-logs-011566070219-5c41b13a
terraform import aws_sns_topic.data_scan arn:aws:sns:${REGION}:${ACCOUNT}:AWS_Data_Scan
terraform import aws_sns_topic.bespin arn:aws:sns:${REGION}:${ACCOUNT}:bespin
terraform import aws_sns_topic.codestar_notifications arn:aws:sns:${REGION}:${ACCOUNT}:codestar-notifications-prod
terraform import aws_sns_topic.jira_notification arn:aws:sns:${REGION}:${ACCOUNT}:Jira-Notification
terraform import aws_sns_topic.security_alarms arn:aws:sns:${REGION}:${ACCOUNT}:Security-Alarms
terraform import aws_sns_topic.trigger_lambda_sf arn:aws:sns:${REGION}:${ACCOUNT}:Trigger_Lambda_Step_Function
terraform import aws_sns_topic.production_cms arn:aws:sns:${REGION}:${ACCOUNT}:Production-CMS
terraform import aws_sns_topic.production_website arn:aws:sns:${REGION}:${ACCOUNT}:Production-Website

# ==================== BACKUP ====================
echo "--- Backup ---"
terraform import aws_backup_vault.default Default
terraform import aws_backup_vault.rds_dr RDS-DR-To-Ireland-Vault
terraform import aws_backup_plan.s3_backup 6b81efd2-43e0-446f-8bf2-c98eeba90426
terraform import aws_backup_plan.media_backup 409cda05-aca6-4c58-85c8-71840f0ad2f1
terraform import aws_backup_plan.rds_dr_ireland_1 739402fa-b3bf-405a-b862-0f7cb248b098
terraform import aws_backup_plan.rds_dr_ireland_3 20a0c5ef-288a-472a-a4d3-c196773694c6

# ==================== EC2 ====================
echo "--- EC2 ---"
terraform import aws_key_pair.jumpbox key-08a36adde8abe0661
terraform import aws_key_pair.jumpbox_muvi key-09e882fb66bdf3525
terraform import aws_key_pair.temp_jb key-0f6ce0258343a6903
terraform import aws_instance.jumpbox_temp i-01a31d87b54b3c4bc
terraform import aws_instance.jumpbox_original i-0a02821d19a7ba0d4
terraform import aws_instance.jumpbox_muvi_temp i-08c651d16377ac756

# ==================== STEP FUNCTIONS ====================
echo "--- Step Functions ---"
terraform import aws_sfn_state_machine.lambda_ecs arn:aws:states:${REGION}:${ACCOUNT}:stateMachine:Step-Function-LambdaECS

# ==================== CODEBUILD ====================
echo "--- CodeBuild ---"
terraform import aws_codebuild_project.muvi_build Muvi-Build
terraform import aws_codebuild_project.muvi_build_offer Muvi-Build-offer
terraform import aws_codebuild_project.muvi_cms_build Muvi-CMS-Build
terraform import aws_codebuild_project.db_migration DB-migration
terraform import aws_codebuild_project.db_preparation DB-Preparation
terraform import aws_codebuild_project.azure_blob azure-blob
terraform import 'aws_codebuild_project.copy_prod_to_staging["muvi-gateway"]' CopyProdToStaging-muvi-gateway
terraform import 'aws_codebuild_project.copy_prod_to_staging["muvi-identity"]' CopyProdToStaging-muvi-identity
terraform import 'aws_codebuild_project.copy_prod_to_staging["muvi-main"]' CopyProdToStaging-muvi-main
terraform import 'aws_codebuild_project.copy_prod_to_staging["muvi-notification"]' CopyProdToStaging-muvi-notification
terraform import 'aws_codebuild_project.copy_prod_to_staging["muvi-payment"]' CopyProdToStaging-muvi-payment
terraform import 'aws_codebuild_project.copy_prod_to_staging["muvi-website"]' CopyProdToStaging-muvi-website

# ==================== CODEPIPELINE ====================
echo "--- CodePipeline ---"
terraform import 'aws_codepipeline.service["Production-Gateway"]' Production-Gateway
terraform import 'aws_codepipeline.service["Production-Identity"]' Production-Identity
terraform import 'aws_codepipeline.service["Production-Main"]' Production-Main
terraform import 'aws_codepipeline.service["Production-Payment"]' Production-Payment
terraform import 'aws_codepipeline.service["Production-Notification"]' Production-Notification
terraform import 'aws_codepipeline.service["Production-FB"]' Production-FB
terraform import 'aws_codepipeline.service["Production-offer"]' Production-offer
terraform import aws_codepipeline.website Production-Website
terraform import aws_codepipeline.cms Production-CMS

# ==================== DYNAMODB ====================
echo "--- DynamoDB ---"
terraform import aws_dynamodb_table.terraform_lock muvi-tf-lockid

# ==================== CLOUDWATCH ====================
echo "--- CloudWatch Log Groups ---"
# CloudTrail log groups
terraform import aws_cloudwatch_log_group.cloudtrail_management aws-cloudtrail-logs-011566070219-6758f19d
terraform import aws_cloudwatch_log_group.cloudtrail_codepipeline aws-cloudtrail-logs-011566070219-1bb30285
terraform import aws_cloudwatch_log_group.cloudtrail_datascan aws-cloudtrail-logs-011566070219-ae25d834
terraform import aws_cloudwatch_log_group.cloudtrail_4891d029 aws-cloudtrail-logs-011566070219-4891d029

# ECS log groups
terraform import 'aws_cloudwatch_log_group.ecs["gateway"]' /ecs/muvi-gateway
terraform import 'aws_cloudwatch_log_group.ecs["identity"]' /ecs/muvi-identity
terraform import 'aws_cloudwatch_log_group.ecs["main"]' /ecs/muvi-main
terraform import 'aws_cloudwatch_log_group.ecs["payment"]' /ecs/muvi-payment
terraform import 'aws_cloudwatch_log_group.ecs["notification"]' /ecs/muvi-notification
terraform import 'aws_cloudwatch_log_group.ecs["fb"]' /ecs/fb
terraform import 'aws_cloudwatch_log_group.ecs["offer"]' /ecs/offer
terraform import 'aws_cloudwatch_log_group.ecs["ticket"]' /ecs/muvi-ticket
terraform import 'aws_cloudwatch_log_group.ecs["website"]' /ecs/muvi-website
terraform import aws_cloudwatch_log_group.ecs_container_insights /aws/ecs/containerinsights/Muvi-Production/performance

# Misc log groups
terraform import aws_cloudwatch_log_group.rdsos_metrics RDSOSMetrics
terraform import aws_cloudwatch_log_group.redis_engine_logs Redis-Engine-Logs
terraform import aws_cloudwatch_log_group.redis_slow_logs Redis-Slow-Logs
terraform import aws_cloudwatch_log_group.muvi_redis_engine muvi-prod-redis-Engine-logs
terraform import aws_cloudwatch_log_group.muvi_redis_slow muvi-prod-redis-Slow-logs
terraform import aws_cloudwatch_log_group.muvi_redis_slow_lower muvi-prod-redis-slow-logs
terraform import aws_cloudwatch_log_group.waf_otp aws-waf-logs-OTP
terraform import aws_cloudwatch_log_group.codepipeline_cms /aws/codepipeline/Production-CMS

# CloudWatch Dashboards
echo "--- CloudWatch Dashboards ---"
terraform import aws_cloudwatch_dashboard.muvi_services Muvi-Services
terraform import aws_cloudwatch_dashboard.production Production-Dashboard
terraform import aws_cloudwatch_dashboard.db DB-Dashboard
terraform import aws_cloudwatch_dashboard.db_health_summary muvi-prod-main-writer_Aurora_PostgreSQL_database_health_summary

echo "============================================"
echo "Import complete — $(date)"
echo "============================================"
echo ""
echo "NEXT STEPS:"
echo "  1. Review import.log for any errors"
echo "  2. Run: terraform plan -out=plan.tfplan"
echo "  3. Review the plan for unexpected changes"
echo "  4. Fix any resource drift in .tf files"
echo "  5. When plan shows minimal/no changes: terraform apply"
