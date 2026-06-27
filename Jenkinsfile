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
        // Utilisation d'une variable globale pour le tag partagé entre stages
        IMG_TAG         = "v${env.BUILD_NUMBER}"
    }

    options {
        timeout(time: 5, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    stages {
        stage('Quality & Lint') {
            agent { kubernetes { yaml podYaml } }
            steps {
                container('helm') {
                    sh "helm lint deploy/" 
                }
            }
        }

        stage('Test & Build') {
            agent { kubernetes { yaml podYaml } }
            steps {
                container('bun') {
                    sh "cd app && bun install && bun test"
                }
                container('kaniko') {
                    // Utilisation de variables d'environnement propres
                    sh "/kaniko/executor --context `pwd`/app --dockerfile `pwd`/app/Dockerfile --destination ${DOCKER_HUB_USER}/${APP_NAME}:${IMG_TAG}"
                }
            }
        }

        stage('Deploy to Dev') {
            agent { kubernetes { yaml podYaml } }
            steps {
                gitCommitAndPush("deploy/values-dev.yaml", "ci: deploy ${IMG_TAG} to dev")
            }
        }

        stage('Promote to Prod?') {
            agent none
            options { timeout(time: 15, unit: 'MINUTES') }
            steps {
                input message: "Promouvoir ${IMG_TAG} en Production ?", ok: "Promouvoir"
            }
        }

        stage('Deploy to Prod') {
            agent { kubernetes { yaml podYaml } }
            steps {
                gitCommitAndPush("deploy/values-prod.yaml", "ci: promote ${IMG_TAG} to prod")
            }
        }
    }
}

// Fonction utilitaire pour éviter la duplication de code et garantir l'idempotence
def gitCommitAndPush(filePath, commitMsg) {
    withCredentials([usernamePassword(credentialsId: 'github-credentials', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_TOKEN')]) {
        sh """
            git config user.name 'jenkins-bot'
            git config user.email 'jenkins@local.cluster'
            git pull origin main --rebase
            
            # Mise à jour sécurisée du tag
            sed -i 's/tag: .*/tag: ${IMG_TAG}/g' ${filePath}
            
            # Vérification si des changements existent
            if ! git diff --quiet ${filePath}; then
                git add ${filePath}
                git commit -m '${commitMsg}'
                git push https://${GIT_USER}:${GIT_TOKEN}@${REPO_URL} HEAD:main
            else
                echo "Aucun changement détecté pour ${filePath}, passage à l'étape suivante."
            fi
        """
    }
}