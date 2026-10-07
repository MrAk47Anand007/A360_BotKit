import { getPackageVersions, updateBotPackageVersion } from './package_versions.js';

// Checkpoints contain only progress and results, never auth tokens or bot JSON.
export async function runPackageVersionJob(request, authToken, checkpoint) {
    const job = { id: request.id, origin: request.origin, folderID: request.folderID, folderName: request.folderName,
        packageName: request.packageName, version: request.version, state: 'running',
        startedAt: new Date().toISOString(), total: request.bots.length, completed: 0, results: [] };
    try {
        await checkpoint(job);
        const versions = await getPackageVersions(request.origin, request.packageName, authToken);
        if (!versions.some(pkg => pkg.packageVersion === request.version)) {
            throw new Error('Selected package version is no longer available. Reload versions.');
        }
        for (const bot of request.bots) {
            job.currentBot = bot.name;
            await checkpoint(job);
            const result = await updateBotPackageVersion(request.origin, bot, request.packageName, request.version, authToken);
            job.results.push({ id: bot.id, name: bot.name, path: bot.path, ...result });
            job.completed++;
            await checkpoint(job);
        }
        job.state = 'complete';
    } catch (error) {
        job.state = 'failed';
        job.error = error.message;
    }
    delete job.currentBot;
    job.finishedAt = new Date().toISOString();
    await checkpoint(job);
    return job;
}
