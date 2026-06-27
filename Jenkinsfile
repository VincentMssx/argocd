// On définit le template du Pod une seule fois pour le réutiliser
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
  volumes:
  - name: kaniko-secret
    secret:
      secretName: dockerhub-config
      items:
      - key: .dockerconfigjson
        path: config.json
'''

pipeline {
    agent none // <--- Très important : Libère les ressources par défaut

    environment {
        DOCKER_HUB_USER = 'vincentmsx'
        APP_NAME        = 'my-react-app'
        REPO_URL        = 'github.com/VincentMssx/argocd.git'
    }

    stages {
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
                        
                        # 1. On récupère d'abord la version la plus fraîche pour éviter les conflits
                        git pull origin main
                        
                        # 2. On modifie le tag
                        sed -i 's/tag: .*/tag: ${IMG_TAG}/g' deploy/values-dev.yaml
                        
                        # 3. On push
                        git add deploy/values-dev.yaml
                        git commit -m 'ci: deploy ${IMG_TAG} to dev'
                        git push https://${GIT_USER}:${GIT_TOKEN}@${REPO_URL} HEAD:main
                    """
                }
            }
        }

        stage('Promote to Prod?') {
            agent none // <--- LIBÈRE LE POD PENDANT L'ATTENTE
            steps {
                // Jenkins attend ici. Ton PC ne consomme plus de RAM/CPU pour ce build.
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
                        
                        # 1. On récupère le commit qui a été fait en Dev
                        git pull origin main
                        
                        # 2. On modifie la Prod
                        sed -i 's/tag: .*/tag: ${IMG_TAG}/g' deploy/values-prod.yaml
                        
                        # 3. On push
                        git add deploy/values-prod.yaml
                        git commit -m 'ci: promote ${IMG_TAG} to prod'
                        git push https://${GIT_USER}:${GIT_TOKEN}@${REPO_URL} HEAD:main
                    """
                }
            }
        }
    }
}