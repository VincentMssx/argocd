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
        stage('Build and Push with Kaniko') {
            steps {
                script {
                    def imageTag = "v${env.BUILD_NUMBER}"
                    container('kaniko') {
                        // Kaniko construit et pousse en une seule commande
                        // Pas besoin de 'docker login' ou 'docker build'
                        sh """
                        /kaniko/executor --context `pwd`/app \
                        --dockerfile `pwd`/app/Dockerfile \
                        --destination ${DOCKER_HUB_USER}/${APP_NAME}:${imageTag}
                        """
                    }
                }
            }
        }
        stage('Update Manifests') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'github-credentials', 
                                                 usernameVariable: 'GIT_USER', 
                                                 passwordVariable: 'GIT_TOKEN')]) {
                    script {
                        def imageTag = "v${env.BUILD_NUMBER}"
                        sh "sed -i 's/tag: .*/tag: ${imageTag}/g' deploy/values.yaml"
                        sh "git config user.name 'jenkins-bot'"
                        sh "git config user.email 'jenkins@local.cluster'"
                        sh "git add deploy/values.yaml"
                        sh "git commit -m 'ci: update image tag to ${imageTag}'"
                        sh "git push https://${GIT_USER}:${GIT_TOKEN}@github.com/VincentMssx/argocd.git main"
                    }
                }
            }
        }
    }
}