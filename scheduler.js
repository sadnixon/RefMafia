'use strict';

const crypto = require('crypto');

const CHECK_INTERVAL = 10 * 1000; // 10 seconds

let schedulerInterval = null;

// Registered functions for each task type
const handlers = new Map();

/**
 * Register a handler for a task type.
 *
 * Example:
 *
 * registerHandler('end_game', async (data) => {
 *   await endGame(data.gameId);
 * });
 */
function registerHandler(type, handler) {
  if (handlers.has(type)) {
    throw new Error(`A handler for task type "${type}" is already registered.`);
  }

  handlers.set(type, handler);
}

/**
 * Schedule a task for a specific time.
 *
 * @param {string} type
 * @param {object} data
 * @param {number} executeAt
 * @returns {Promise<string>}
 */
async function scheduleTask(type, data, executeAt) {
  if (!handlers.has(type)) {
    throw new Error(`No handler registered for task type "${type}".`);
  }

  const taskId = crypto.randomUUID();

  const task = {
    id: taskId,
    type,
    data,
    executeAt,
    status: 'pending',
    attempts: 0,
    createdAt: Date.now(),
  };

  await schedDB.set(`scheduled_task:${taskId}`, task);

  // Maintain an index of task IDs.
  const taskIds = (await schedDB.get('scheduled_tasks')) ?? [];

  taskIds.push(taskId);

  await schedDB.set('scheduled_tasks', taskIds);

  const gameState = await gameInfo.get('gameState');
  gameState.phaseTimers.push({ taskId: taskId, timeStamp: executeAt });
  await gameInfo.set('gameState', gameState);
  console.log(`Scheduling task ${taskId} (${type})`);
  return taskId;
}

/**
 * Schedule a task exactly X hours from now.
 */
async function scheduleInXHours(type, data, hours) {
  const executeAt = Date.now() + hours * 60 * 60 * 1000;

  return scheduleTask(type, data, executeAt);
}

/**
 * Schedule a task exactly X seconds from now.
 */
async function scheduleInXSeconds(type, data, seconds) {
  const executeAt = Date.now() + seconds * 1000;

  return scheduleTask(type, data, executeAt);
}

/**
 * Cancel a scheduled task.
 */
async function cancelTask(taskId) {
  const key = `scheduled_task:${taskId}`;

  const task = await schedDB.get(key);

  if (!task) {
    return false;
  }

  await schedDB.delete(key);
  console.log(`Cancelling scheduled task ${taskId} (${task.type})`);

  const taskIds = (await schedDB.get('scheduled_tasks')) ?? [];

  await schedDB.set(
    'scheduled_tasks',
    taskIds.filter((id) => id !== taskId),
  );

  return true;
}

/**
 * Clear all tasks.
 */
async function clearTasks() {
  const gameState = await gameInfo.get('gameState');
  for (const timer of gameState.phaseTimers) {
    await cancelTask(timer.taskId);
  }
  gameState.phaseTimers = [];
  await gameInfo.set('gameState',gameState);
  return true;
}

/**
 * Execute a single task.
 */
async function executeTask(task) {
  const handler = handlers.get(task.type);

  if (!handler) {
    console.error(`No handler found for task type "${task.type}".`);

    return;
  }

  const key = `scheduled_task:${task.id}`;

  try {
    // Mark task as running.
    task.status = 'running';
    task.attempts += 1;

    await schedDB.set(key, task);

    console.log(`Executing scheduled task ${task.id} (${task.type})`);

    await handler(task.data);

    // Task completed successfully.
    await schedDB.delete(key);

    const taskIds = (await schedDB.get('scheduled_tasks')) ?? [];

    await schedDB.set(
      'scheduled_tasks',
      taskIds.filter((id) => id !== task.id),
    );

    console.log(`Scheduled task ${task.id} completed.`);
  } catch (error) {
    console.error(`Error executing scheduled task ${task.id}:`, error);

    // Put it back into pending state so it can retry.
    task.status = 'pending';

    await schedDB.set(key, task);
  }
}

/**
 * Check for tasks that need to execute.
 */
async function checkTasks() {
  try {
    const taskIds = (await schedDB.get('scheduled_tasks')) ?? [];

    for (const taskId of taskIds) {
      const task = await schedDB.get(`scheduled_task:${taskId}`);

      if (!task) {
        continue;
      }

      if (task.status === 'pending' && task.executeAt <= Date.now()) {
        await executeTask(task);
      }
    }
  } catch (error) {
    console.error('Error checking scheduled tasks:', error);
  }
}

/**
 * Start the scheduler.
 */
async function startScheduler() {
  if (schedulerInterval) {
    return;
  }

  console.log('Starting scheduler...');

  // Check immediately when the bot starts.
  await checkTasks();

  schedulerInterval = setInterval(checkTasks, CHECK_INTERVAL);

  console.log('Scheduler started.');
}

/**
 * Stop the scheduler.
 */
function stopScheduler() {
  if (!schedulerInterval) {
    return;
  }

  clearInterval(schedulerInterval);
  schedulerInterval = null;

  console.log('Scheduler stopped.');
}

module.exports = {
  registerHandler,
  scheduleTask,
  scheduleInXHours,
  scheduleInXSeconds,
  cancelTask,
  clearTasks,
  startScheduler,
  stopScheduler,
};
