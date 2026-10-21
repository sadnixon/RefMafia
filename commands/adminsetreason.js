'use strict';

const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('adminsetreason')
  .setDescription('Set the reason a player died')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('The user to set the reason for')
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName('reason')
      .setDescription('The reason for the kill')
      .setRequired(true),
  )
  .addIntegerOption((option) =>
    option
      .setName('order')
      .setDescription('The number kill that this player was')
      .setRequired(true),
  );

async function execute(interaction, user) {
  await interaction.deferReply({ ephemeral: true });
  // Only authorized users can authorize other users
  if (!user.isAuthorized) {
    return interaction.editReply({
      content: 'ADMIN ONLY COMMAND',
      ephemeral: true,
    });
  }

  const gameOngoing = await gameInfo.get('inPlay');
  const currentPlayers = await gameInfo.get('players');
  const targetUser = interaction.options.getUser('user').id;

  if (!gameOngoing || !currentPlayers.includes(targetUser)) {
    await interaction.editReply({
      content: `What if YOU tried to set someone's kill reason but SadNixon said "NO"`,
      ephemeral: true,
    });
    return;
  }

  const gameState = await gameInfo.get('gameState');
  const playerIndex = gameState.players.map((e) => e.id).indexOf(targetUser);
  const reason = interaction.options.getString('reason');
  const order = interaction.options.getInteger('order');

  gameState.players[playerIndex].killReason = reason.toUpperCase();
  gameState.players[playerIndex].killOrder = order;

  await gameInfo.set('gameState', gameState);

  await interaction.editReply({
    content: `<@${targetUser}> now has ${reason.toUpperCase()} as their kill reason with order ${order}.`,
    ephemeral: true,
  });
}

module.exports = {
  data,
  execute,
};
