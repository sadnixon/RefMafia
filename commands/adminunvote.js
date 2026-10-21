'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const {
  standardEmbed,
  sendGameState,
  sendVoteState,
} = require('../message-helpers');
const { clearTasks, scheduleInXHours } = require('../scheduler');

const data = new SlashCommandBuilder()
  .setName('adminunvote')
  .setDescription('Unpick your execution')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('The user to unvote for')
      .setRequired(true),
  );

async function execute(interaction, user) {
  const targetUser = interaction.options.getUser('user').id;
  await interaction.deferReply({ ephemeral: true });
  if (!interaction.guildId) {
    return interaction.editReply({
      content: 'This command can only be used in a server.',
      ephemeral: true,
    });
  }
  if (!user.isAuthorized) {
    return interaction.editReply({
      content: 'ADMIN ONLY COMMAND',
      ephemeral: true,
    });
  }
  const gameOngoing = await gameInfo.get('inPlay');
  const gameState = await gameInfo.get('gameState');
  const currentPlayers = await gameInfo.get('players');
  const playerIndex =
    gameState?.players?.findIndex((e) => e.id === targetUser) ?? -1;
  if (
    !gameOngoing ||
    //!gameState.currentState === 'Day' ||
    !currentPlayers.includes(targetUser)
    //gameState.players[playerIndex].alive === false
  ) {
    return interaction.editReply({
      content: `It's not time for you to unvote!`,
      ephemeral: true,
    });
  }

  const gameChannels = await gameInfo.get('game_channels');
  const pickChannel = await interaction.guild.channels.fetch(
    gameChannels['picks'].channelId,
  );

  gameState.dayVotes[gameState.dayIndex][playerIndex] = null;

  await gameInfo.set('gameState', gameState);

  await pickChannel.send(
    standardEmbed(
      'A vote has been retracted!',
      `**<@${targetUser}> has unvoted!**`,
    ),
  );
  await interaction.editReply({
    content: `You unvoted!`,
    ephemeral: true,
  });

  voteCycler = (voteCycler + 1) % 5;

  let mostVotes = 0;
  for (const player of [...currentPlayers, 'Sleep']) {
    const voteCount = gameState.dayVotes[gameState.dayIndex].filter(
      (e) => e === player,
    ).length;
    if (voteCount > mostVotes) {
      mostVotes = voteCount;
    }
  }

  const voteMaj =
    gameState.currentState === 'Day'
      ? Math.floor(gameState.players.filter((e) => e.alive).length / 2) + 1
      : Math.ceil((gameState.players.filter((e) => e.alive).length * 2) / 3);

  if (voteCycler === 0 || mostVotes >= voteMaj - 3) {
    await sendVoteState(interaction.client);
  }
}

module.exports = {
  data,
  execute,
};
