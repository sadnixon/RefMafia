'use strict';

const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const { killPlayer } = require('../message-helpers');

const data = new SlashCommandBuilder()
  .setName('forceflip')
  .setDescription('Force a player to flip')
  .addUserOption((option) =>
    option.setName('user').setDescription('The user to flip').setRequired(true),
  );

async function execute(interaction, user) {
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
  const currentPlayers = await gameInfo.get('players');
  const gameState = await gameInfo.get('gameState');
  const targetUser = interaction.options.getUser('user').id;

  if (!gameOngoing || !currentPlayers.includes(targetUser)) {
    await interaction.editReply({
      content: `What if YOU tried to FLIP someone but SadNixon said "NO"`,
      ephemeral: true,
    });
    return;
  }

  const playerIndex = gameState.players.map((e) => e.id).indexOf(targetUser);
  gameState.players[playerIndex].flipped = true;

  await gameInfo.set('gameState', gameState);

  await interaction.editReply({
    content: `They're getting flipped!`,
    ephemeral: true,
  });
}

module.exports = {
  data,
  execute,
};
