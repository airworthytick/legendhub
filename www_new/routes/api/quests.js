let mysql = require("./mysql-connection");
let gql = require("graphql");
let { GraphQLDateTime } = require("graphql-iso-date");

// required api schemas
let itemSchema = require("./items.js");

let questSelectSQL = `SELECT Q.Id
    ,Q.Title
    ,Q.AreaId
    ,A.Name AS AreaName
    ,A.EraId
    ,E.Name AS EraName
    ,Q.Content
    ,Q.ModifiedOn
    ,Q.ModifiedBy
    ,Q.ModifiedByIP
    ,Q.ModifiedByIPForward
    ,Q.Whoises
    ,Q.Stat
    FROM Quests Q
    LEFT JOIN Areas A ON A.Id = Q.AreaId
    LEFT JOIN Eras E ON E.Id = A.EraId`;

class Quest {
    constructor(sqlResult) {
        this.id = sqlResult.Id;
        this.title = sqlResult.Title;
        this.areaId = sqlResult.AreaId;
        this.areaName = sqlResult.AreaName;
        this.eraId = sqlResult.EraId;
        this.eraName = sqlResult.EraName;
        this.content = sqlResult.Content;
        this.modifiedOn = sqlResult.ModifiedOn;
        this.modifiedBy = sqlResult.ModifiedBy;
        this.modifiedByIP = sqlResult.ModifiedByIP;
        this.modifiedByIPForward = sqlResult.ModifiedByIPForward;
        this.whoises = sqlResult.Whoises;
        this.stat = sqlResult.Stat;
    }

    getItems() {
        let questId = this.id;
        return new Promise(function(resolve, reject) {
            mysql.query(`${ itemSchema.selectSQL.itemSelectSQL } FROM Items WHERE QuestId = ?`,
                [questId],
                function(error, results, fields) {
                    if (error)
                        reject(error);

                    if (results.length > 0){
                        let items = [];
                        for (let i = 0; i < results.length; ++i)
                            items.push(new itemSchema.classes.Item(results[i]));

                        resolve(items);
                    }
                    else
                        resolve([]);
                });
        });
    }
}

let getQuestById = function(id) {
    return new Promise(function(resolve, reject) {
        mysql.query(`${ questSelectSQL } WHERE Q.Id = ?`,
            [id],
            function(error, results, fields) {
                if (error)
                    reject(error);

                if (results.length > 0)
                    resolve(new Quest(results[0]));
                else
                    reject(Error(`Quest with id (${id}) not found.`));
            });
    });
};

let questType = new gql.GraphQLObjectType({
    name: "Quest",
    fields: () => ({
        id: { type: new gql.GraphQLNonNull(gql.GraphQLInt) },
        title: { type: new gql.GraphQLNonNull(gql.GraphQLString) },
        areaId: { type: gql.GraphQLInt },
        areaName: { type: gql.GraphQLString },
        eraId: { type: gql.GraphQLInt },
        eraName: { type: gql.GraphQLString },
        content: { type: new gql.GraphQLNonNull(gql.GraphQLString) },
        modifiedOn: { type: new gql.GraphQLNonNull(GraphQLDateTime) },
        modifiedBy: { type: new gql.GraphQLNonNull(gql.GraphQLString) },
        modifiedByIP: { type: gql.GraphQLString },
        modifiedByIPForward: { type: gql.GraphQLString },
        content: { type: gql.GraphQLString },
        stat: { type: new gql.GraphQLNonNull(gql.GraphQLBoolean) },

        getItems: { type: new gql.GraphQLList(itemSchema.types.itemType) }
    })
});

let qFields = {
    getQuestById: {
        type: questType,
        args: {
            id: { type: gql.GraphQLInt }
        },
        resolve: function(_, {id}) {
            return getQuestById(id);
        }
    }
};

module.exports.queryFields = qFields;
module.exports.types = { questType };
module.exports.classes = { Quest };
module.exports.selectSQL = { questSelectSQL };
