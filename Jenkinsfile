pipeline {
    agent {
        kubernetes {
            yaml '''
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: kaniko
    image: gcr.io/kaniko-project/executor:debug
    command: ['sleep']
    args: ['99d']
    volumeMounts:
    - name: kaniko-secret
      mountPath: /kaniko/.docker
  - name: bun
    image: oven/bun:1
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
        }
    }
    environment {
        DOCKER_HUB_USER = 'vincentmsx'
        APP_NAME        = 'my-react-app'
    }
    stages {
        stage('Test') {
            steps {
                container('bun') {
                    sh "cd app && bun install && bun test"
                }
            }
        }

        stage('Build and Push') {
            steps {
                script {
                    env.IMG_TAG = "v${env.BUILD_NUMBER}"
                    container('kaniko') {
                        sh "/kaniko/executor --context `pwd`/app --dockerfile `pwd`/app/Dockerfile --destination ${DOCKER_HUB_USER}/${APP_NAME}:${IMG_TAG}"
                    }
                }
            }
        }

        stage('Deploy to Dev') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'github-credentials', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_TOKEN')]) {
                    sh """
                        sed -i 's/tag: .*/tag: ${IMG_TAG}/g' deploy/values-dev.yaml
                        git config user.name 'jenkins-bot'
                        git config user.email 'jenkins@local.cluster'
                        git add deploy/values-dev.yaml
                        git commit -m 'ci: deploy ${IMG_TAG} to dev'
                        git push https://${GIT_USER}:${GIT_TOKEN}@github.com/VincentMssx/argocd.git HEAD:main
                    """
                }
            }
        }

        stage('Promote to Prod?') {
            steps {
                // Jenkins va s'arrêter ici et afficher un bouton "Approve" ou "Abort"
                input message: "Promouvoir la version ${IMG_TAG} en Production ?", ok: "Promouvoir"
            }
        }

        stage('Deploy to Prod') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'github-credentials', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_TOKEN')]) {
                    sh """
                        sed -i 's/tag: .*/tag: ${IMG_TAG}/g' deploy/values-prod.yaml
                        git add deploy/values-prod.yaml
                        git commit -m 'ci: promote ${IMG_TAG} to prod'
                        git push https://${GIT_USER}:${GIT_TOKEN}@github.com/VincentMssx/argocd.git HEAD:main
                    """
                }
            }
        }
    }
}