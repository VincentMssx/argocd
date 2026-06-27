pipeline {
    agent {
        kubernetes {
            yaml '''
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: docker
    image: docker:24.0.6-cli
    command: ['cat']
    tty: true
    env:
    - name: DOCKER_HOST
      value: tcp://localhost:2375
  - name: dind
    image: docker:24.0.6-dind
    securityContext:
      privileged: true
    env:
    - name: DOCKER_TLS_CERTDIR
      value: ""
'''
        }
    }
    environment {
        DOCKER_HUB_USER = 'vincentmsx'
        APP_NAME        = 'my-react-app'
    }
    stages {
        stage('Build and Push Docker Image') {
            steps {
                script {
                    def imageTag = "v${env.BUILD_NUMBER}"
                    container('docker') {
                        // Attendre que le moteur Docker interne soit prêt
                        sh 'while ! docker ps; do sleep 1; done'
                        
                        withCredentials([usernamePassword(credentialsId: 'docker-hub-credentials', 
                                                         usernameVariable: 'DH_USER', 
                                                         passwordVariable: 'DH_PASSWORD')]) {
                            sh "docker login -u $DH_USER -p $DH_PASSWORD"
                            sh "docker build -t ${DOCKER_HUB_USER}/${APP_NAME}:${imageTag} ./app"
                            sh "docker push ${DOCKER_HUB_USER}/${APP_NAME}:${imageTag}"
                        }
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