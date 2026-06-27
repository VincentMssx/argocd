def podYaml = '''
apiVersion: v1
kind: Pod
spec:
  containers:

  - name: bun
    image: oven/bun:1
    command: ['cat']
    tty: true

  - name: kaniko
    image: gcr.io/kaniko-project/executor:debug
    command: ['sleep']
    args: ['99d']
    volumeMounts:
    - name: kaniko-secret
      mountPath: /kaniko/.docker

  - name: helm
    image: alpine/helm:3.14.4
    command: ['cat']
    tty: true

  volumes:
  - name: kaniko-secret
    secret:
      secretName: dockerhub-config
      items:
      - key: .dockerconfigjson
        path: config.json
'''

pipeline {

    agent none

    environment {
        DOCKER_HUB_USER = "vincentmsx"
        APP_NAME = "my-react-app"
        REPO_URL = "github.com/VincentMssx/argocd.git"
        IMG_TAG = "v${BUILD_NUMBER}"
    }

    options {
        disableConcurrentBuilds()
        timeout(time: 10, unit: 'MINUTES')
    }

    stages {

        stage("Checkout") {
            agent any
            steps {
                checkout scm
            }
        }

        stage("Tests") {
            agent { kubernetes { yaml podYaml } }
            steps {
                container("bun") {
                    sh """
                    cd app
                    bun install
                    bun test
                    """
                }
            }
        }

        stage("Helm Lint") {
            agent { kubernetes { yaml podYaml } }
            steps {
                container("helm") {
                    sh "helm lint deploy/"
                }
            }
        }

        stage("Build Image") {
            agent { kubernetes { yaml podYaml } }
            steps {
                container("kaniko") {
                    sh """
                    /kaniko/executor \
                        --context `pwd`/app \
                        --dockerfile `pwd`/app/Dockerfile \
                        --destination ${DOCKER_HUB_USER}/${APP_NAME}:${IMG_TAG}
                    """
                }
            }
        }

        stage("Deploy Dev (GitOps)") {
            agent any
            steps {
                sh """
                git config user.name "jenkins-bot"
                git config user.email "jenkins@local"

                git checkout main
                git pull origin main

                sed -i 's/tag: .*/tag: ${IMG_TAG}/' deploy/values-dev.yaml

                git add deploy/values-dev.yaml
                git commit -m "deploy ${IMG_TAG} to dev" || true
                git push origin main
                """
            }
        }

        stage("Approve Prod") {
            agent none
            steps {
                input message: "Deploy ${IMG_TAG} to production?"
            }
        }

        stage("Deploy Prod") {
            agent any
            steps {
                sh """
                git config user.name "jenkins-bot"
                git config user.email "jenkins@local"

                git checkout main
                git pull origin main

                sed -i 's/tag: .*/tag: ${IMG_TAG}/' deploy/values-prod.yaml

                git add deploy/values-prod.yaml
                git commit -m "promote ${IMG_TAG} to prod" || true
                git push origin main
                """
            }
        }
    }
}