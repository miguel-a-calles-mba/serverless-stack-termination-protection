/**
 * @author Miguel A. Calles, MBA <miguelacallesmba@gmail.com>
 */

'use strict';

/**
 * Class for the Serverless plugin.
 */
class StackTerminationProtection {
    /**
     *
     * @param {*} serverless Serverless object.
     * @param {*} options Options object.
     */
    constructor(serverless, options, { log } = {}) {
        this.serverless = serverless;
        this.options = options;
        this.hooks = {
            // TODO: Add hook to disable protection prior to sls remove
            'after:deploy:deploy': this.afterDeployDeploy.bind(this),
        };
        // TODO: Updating termination protection without deploying.
        this.commands = {};

        /* backward compatibility for Serverless V3 logging */
        this.log = log ? log : {
            debug: this.serverless.cli.log,
            info: this.serverless.cli.log,
            warning: this.serverless.cli.log,
        };
    }

    /**
     * Function for the 'after:deploy:deploy' hook.
     * @return {Promise<void>}
     */
    afterDeployDeploy() {
        let protectedStages = [];
        if (
            this.serverless.service.custom &&
            this.serverless.service.custom.serverlessTerminationProtection &&
            this.serverless.service.custom.serverlessTerminationProtection.stages &&
            Array.isArray(this.serverless.service.custom.serverlessTerminationProtection.stages)
        ) {
            protectedStages = this.serverless.service.custom.serverlessTerminationProtection.stages;
        }

        this.provider = this.serverless.getProvider('aws');
        const serviceName = this.serverless.service.getServiceName();
        const stage = this.provider.getStage();
        this.stackName = this.serverless.service.provider.stackName || `${serviceName}-${stage}`;

        let isProtected = true;
        // if disable option is set or stage is not included in predefined list, then set protection to false
        if (
            Boolean(this.options['disable-termination-protection']) ||
            (this.options.param || []).includes('disable-termination-protection') ||
            (protectedStages.length !== 0 && !protectedStages.includes(stage))
        ) {
            isProtected = false;
        }

        return this.updateTerminationProtection(isProtected)
            .then(() => this.log.info(
                `${isProtected ? 'En' : 'Dis'}abled termination protection`,
            ))
            .catch((err) => {
                this.log.warning('Failed to update termination protection');
                this.log.debug(JSON.stringify(err));
            });
    }

    /**
     * Update the AWS CloudFormation stack termination protection.
     * @param {boolean} isEnabled
     * @return {Promise<string | Error>}
     */
    updateTerminationProtection(isEnabled) {
        const params = {
            EnableTerminationProtection: isEnabled,
            StackName: this.stackName,
        };
        return new Promise((resolve, reject) => {
            this.provider
                .request(
                    'CloudFormation',
                    'updateTerminationProtection',
                    params
                )
                .then((data) => resolve(data.StackId))
                .catch((err) => reject(err));
        });
    }
}

module.exports = StackTerminationProtection;
