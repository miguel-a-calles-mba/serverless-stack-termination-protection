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
    constructor(serverless, options) {
        this.serverless = serverless;
        this.isProtected = !Boolean(options['disable-termination-protection']);
        this.hooks = {
            // TODO: Add hook to disable protection prior to sls remove
            'after:deploy:deploy': this.afterDeployDeploy.bind(this),
        };
        // TODO: Updating termination protection without deploying.
        this.commands = {};
    }

    /**
     * Customized console log.
     * @param  {...any} args
     */
    log(...args) {
        let output = 'serverless-stack-termination-protection: ';
        args.forEach((x) => {
            output += ` ${(typeof(x) === 'object') ? JSON.stringify(x) : x}`;
        });
        console.log(output);
    }

    /**
     * Function for the 'after:deploy:deploy' hook.
     * @return {Promise<void>}
     */
    afterDeployDeploy() {
        this.provider = this.serverless.getProvider('aws');
        const serviceName = this.serverless.service.getServiceName();
        const stage = this.provider.getStage();
        this.stackName = this.serverless.service.provider.stackName || `${serviceName}-${stage}`;
        return this.updateTerminationProtection(this.isProtected)
            .then((stackId) => this.log(
                'Successfully',
                `${this.isProtected ? 'en' : 'dis'}abled`,
                'termination protection for stack',
                stackId
            ))
            .catch((err) => this.log(
                'Failed to update termination protection:',
                err
            ));
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
