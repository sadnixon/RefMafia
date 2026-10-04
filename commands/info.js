'use strict';

const {
  EmbedBuilder,
  SlashCommandBuilder,
} = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('info')
  .setDescription('Show information about available commands');

async function execute(interaction, user) {
  await interaction.deferReply({ ephemeral: true });
  const embed = new EmbedBuilder()
    .setTitle('Commands')
    .addFields(
      {
        name: '/in',
        value:
          'This gets you in the game lobby',
      },
      {
        name: '/out',
        value:
          'This removes you from the lobby',
      },
      {
        name: '/reg',
        value:
          "Register a channel as your private channel for games",
      },
      {
        name: '/ack',
        value:
          "Acknowledge that you saw your role at the start of the game",
      },
      {
        name: '/vote',
        value:
          "Vote on who you want to be executed today",
      },
      {
        name: '/ita',
        value:
          "Launch an ITA on a player",
      },
      {
        name: '/gamestate',
        value:
          "View the current gamestate",
      },
      {
        name: '/votestate',
        value:
          "View a day's pick/vote summary",
      },
      {
        name: '/info',
        value:
          'Show this help message.',
      }
    );

  await interaction.editReply({
    embeds: [embed],
  });
}

module.exports = {
  data,
  execute,
};