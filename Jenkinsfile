def podYaml = '''
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
  - name: helm
    image: alpine/helm:3.12.0
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
        DOCKER_HUB_USER = 'vincentmsx'
        APP_NAME        = 'my-react-app'
        REPO_URL        = 'github.com/VincentMssx/argocd.git'
    }

    stages {
        stage('Quality & Lint') {
            agent { kubernetes { yaml podYaml } }
            steps {
                container('helm') {
                    // Les fichiers sont déjà là, pas besoin de git clone !
                    sh "helm lint deploy/" 
                }
            }
        }

        stage('Test & Build') {
            agent { kubernetes { yaml podYaml } }
            steps {
                script {
                    env.IMG_TAG = "v${env.BUILD_NUMBER}"
                    container('bun') {
                        sh "cd app && bun install && bun test"
                    }
                    container('kaniko') {
                        sh "/kaniko/executor --context `pwd`/app --dockerfile `pwd`/app/Dockerfile --destination ${DOCKER_HUB_USER}/${APP_NAME}:${IMG_TAG}"
                    }
                }
            }
        }

        stage('Deploy to Dev') {
            agent { kubernetes { yaml podYaml } }
            steps {
                withCredentials([usernamePassword(credentialsId: 'github-credentials', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_TOKEN')]) {
                    sh """
                        git config user.name 'jenkins-bot'
                        git config user.email 'jenkins@local.cluster'
                        git pull origin main
                        sed -i 's/tag: .*/tag: ${IMG_TAG}/g' deploy/values-dev.yaml
                        git add deploy/values-dev.yaml
                        git commit -m 'ci: deploy ${IMG_TAG} to dev'
                        git push https://${GIT_USER}:${GIT_TOKEN}@${REPO_URL} HEAD:main
                    """
                }
            }
        }

        stage('Promote to Prod?') {
            agent none
            options { timeout(time: 5, unit: 'MINUTES') }
            steps {
                input message: "Promouvoir ${env.IMG_TAG} en Production ?", ok: "Promouvoir"
            }
        }

        stage('Deploy to Prod') {
            agent { kubernetes { yaml podYaml } }
            steps {
                withCredentials([usernamePassword(credentialsId: 'github-credentials', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_TOKEN')]) {
                    sh """
                        git config user.name 'jenkins-bot'
                        git config user.email 'jenkins@local.cluster'
                        git pull origin main
                        sed -i 's/tag: .*/tag: ${IMG_TAG}/g' deploy/values-prod.yaml
                        git add deploy/values-prod.yaml
                        git commit -m 'ci: promote ${IMG_TAG} to prod'
                        git push https://${GIT_USER}:${GIT_TOKEN}@${REPO_URL} HEAD:main
                    """
                }
            }
        }
    }
}