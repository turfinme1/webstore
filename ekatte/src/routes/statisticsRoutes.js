const statisticsRoutes = (statisticsController) => {
  return {
    "/statistics:GET": async (request, response) => {
      try {
        await statisticsController.getStatistics(response);
      } catch (error) {
        console.log(error);
        return createResponse(response, 500, "application/json", {
          error: "Internal Server Error",
        });
      }
    },
  };
};

export default statisticsRoutes;
