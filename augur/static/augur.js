var web3;
var augur = {

    evmAddress: '0xc09ceb49fa837ef0a2a7a0c8e2572d25aa7291d4',   // POC8 private
    evmAddress: '0xc09ceb49fa837ef0a2a7a0c8e2572d25aa7291d4',   // POC8 testnet

    data: {
        account: '-',
        balance: '-',
        decisions: {},
        branches: [
            {name: 'Global', id: 1010101, rep: 1}
        ],
        markets: {},
        cycle: {
            count: 0,
            decisions: {}
        }
    },

    start: function() {

        // get the web3 object
        if (typeof web3 === 'undefined') web3 = require('web3');

        web3.setProvider(new web3.providers.HttpSyncProvider());

        try {

            web3.eth.accounts;
            augur.init();

        } catch(err) {

            console.log('[augur] no ethereum client found');
            $('#no-eth-modal').modal('show');            
        }

    },

    init: function() {

        $('#evm-address-form').on('submit', function(event) {
            event.preventDefault();
            augur.evmAddress = $('#evm-address').val();
            $.cookie('evmAddress', augur.evmAddress);
            web3.db.set('augur', 'evmAddress', augur.evmAddress);
            $('#evm-address-modal').modal('hide');
            augur.init();
        });

        // get EVM address
        if (!augur.evmAddress) {
            if ($.cookie('evmAddress')) {
                augur.evmAddress = $.cookie('evmAddress');
            } else if (web3.db.get('augur', 'evmAddress')) {
                augur.evmAddress = web3.db.get('augur', 'evmAddress');
            } else {
                $('#evm-address-modal').modal('show');
                return;
            }
        }

        var Contract = web3.eth.contract(augur.abi);
        augur.contract = new Contract(augur.evmAddress);
        console.log('[augur] evm contract loaded from ' + augur.evmAddress);
        $('#logo .progress-bar').css('width', '25%');

        augur.data.account = web3.eth.accounts[0];
        augur.data.balance = augur.contract.call().balance(augur.data.account).toString(10);

        // render initial data
        augur.update(augur.data);
        $('#logo .progress-bar').css('width', '100%');
        $('body').removeClass('stopped').addClass('running');

        augur.network = {
            host: 'localhost:8080',
            peerCount: '-',
            blockNumber: '-',
            miner: web3.eth.mining,
            gas: '-',
            gasPrice: '-'
        }

        // watch ethereum chain for changes and update network data
        web3.eth.filter('chain').watch(function() {

            augur.network.peerCount = web3.eth.peerCount;
            augur.network.blockNumber = web3.eth.blockNumber;
            var wei = web3.eth.getBalance(augur.data.account);
            var finney = web3.fromWei(wei, 'finney');
            augur.network.gas = finney + ' finney';
            var wei = web3.eth.gasPrice;
            var finney = web3.fromWei(wei, 'finney');
            augur.network.gasPrice = finney + ' finney';
            augur.update(augur.network);
        });

        // watch for augur contract changes
        web3.eth.filter(augur.contract).watch(function(r) {

            console.log('contract change');
            console.log(r);
        });

        // user events
        $('.reporting form').on('submit', function(event) {

            event.preventDefault();

            var results = $(this).serializeArray();

            _.each(results, function(r, i) {
                results[i]['branch'] = _decision[r.name].vote_id;
            });

            //socket.emit('report', results);
        }); 

        $('#create-branch-modal form').on('submit', function(event) {

            event.preventDefault();
            var parent = parseInt($('#create-branch-modal .branch-parent').val());
            var branchName = $('#create-branch-modal .branch-name').val();

            if (augur.contract.call().makeSubBranch(branchName, 1, parent)) {
                $('#create-branch-modal').modal('hide');
            } else {
                console.log("[augur] failed to create sub-branch");
            }
        });

        $('#add-decision-modal form').on('submit', function(event) {

            event.preventDefault();

            var args = {
                'branchId': $('#decision-branch').val(),
                'decisionText': $('#decision-text').val(),
                'decisionMaturation': $('#decision-time').val(),
                'marketInv': $('#market-investment').val()
            }

            //socket.emit('add-decision', args);
            $('#add-decision-modal').modal('hide');
        });

        $('#send-cash-modal form').on('submit', function(event) {

            event.preventDefault();
            var address = $('#cash-dest-address').val();
            var amount = $('#cash-amount').val();
            nodeMonitor.postMessage({'sendCash': {'address': address, 'amount': amount}});
            $('#send-cash-modal').modal('hide');
        });

        $('#trade-modal form').on('submit', function(event) {

            event.preventDefault();
            var args = {
                'marketId': $('#trade-market').val(),
                'marketState': $('#market-state select').val(),
                'tradeAmount': $('#trade-amount').val(),
                'tradeType': $('#trade-modal input[name=trade-type]').val()
            }
            //socket.emit('trade', args);
            $('#trade-modal').modal('hide');
        });
        $('#trade-modal input[name=trade-type]').on('change', function(event) {
           $('#trade-modal button.trade').text($(this).val()).removeAttr('disabled');
        });

        $('#send-rep-modal form').on('submit', function(event) {

            event.preventDefault();
            var address = $('#rep-dest-address').val();
            var amount = $('#send-rep-modal .rep-amount').val();
            var branch = $('#send-rep-modal .branch-id').val();
            
            if (augur.contract.call().sendReputation(branch, address, amount)) {
                $('#send-rep-modal').modal('hide');
            } else {
                console.log('[augur] failed to send reputation');
            }
        });

        $('#alert').on('closed.bs.alert', function() {
            $('#alert div').empty();
        });
    },

    // helper for rendering several components 
    update: function(data) {

        _.each(data, function (value, prop) {

            if (prop in augur.render) augur.render[prop](value);
            console.log(prop + ': ' + value);
        });
    },

    // DOM manipulation (React or Mercury?)
    render: {

        alert: function(data) {

            $('#alert').show();

            $('#alert').removeClass('alert-info').removeClass('alert-success').removeClass('alert-warning').removeClass('alert-danger');
            $('#alert').addClass('alert-'+data.type);

            items = [];
            _.each(data.messages, function(message) {
                items.push($('<p>').html(message));
            });
            $('#alert div').append(items);
            $('#alert').show();
            $('#alert div').scrollTop($('#alert div')[0].scrollHeight);
        },

        cycle: function(data) {

            if (data.phase == 'catching up') {
                var phase = $('<i>').text(data.phase);
            } else {
                var phase = $('<span>').text(data.phase);
            }
            $('.cycle h3').html('Cycle ending ' + augur.formatDate(data.end_date)).append(phase);

            if (data.percent > 97.5) {
                var phases = [{name: 'reporting', percent: 87.5}, {name: 'reveal', percent: 10}, {name: 'svd', percent: data.percent - 97.5}];
            } else if (data.percent > 87.5) {
                var phases = [{name: 'reporting', percent: 87.5}, {name: 'reveal', percent: data.percent - 87.5}];
            } else {
                var phases = [{name: 'reporting', percent: data.percent}];
            }

            var template = _.template($("#progress-template").html());
            $('.cycle .progress').empty();
            _.each(phases, function(p) {
                $('.cycle .progress').append(template({'type': p.name, 'percent': p.percent}))
            });

            $('.cycle').show();
        },

        report: function(data) {

            $('.cycle').removeClass('reporting').removeClass('reveal').removeClass('svd').addClass(data.phase);

            if (!$.isEmptyObject(data)) {

                $('#report-decisions').empty();

                var h = $('<h4>').html('Report');
                var s = $('<span>').html('Ends at ' + augur.formatDate(data.reveal_date));
                var report_header = $('<li>').addClass('list-group-item').append([h, s]);
                $('#report-decisions').append(report_header);
                var template = _.template($("#report-template").html());
                _.each(data, function(d, id) {

                    if (d['state'] == '0') { d['state_desc'] = 'False' }
                    else if (d['state'] == '1') { d['state_desc'] = 'True' }
                    else if (d['state'] == '0.5') { d['state_desc'] = 'Ambiguous or Indeterminent' }
                    else { d['state_desc'] = 'Absent' }

                    $('#report-decisions').append(template({'d': d}));
                    $('#report input[name='+d.decision_id+']').attr('data-state', d.state);
                });

                $('#report').show();

                $('#report input[name]').on('change', function(e) {

                    var report = {'decision_id': $(this).attr('name'), 'state': $(this).val()};
                    var state = $('#report input[name='+$(this).attr('name')+']').attr('data-state');
                    var self = this;

                    if (state) {

                        var dialog = {
                            message: 'Changing this decision will incur and additional fee.  Are you sure you wish to change it?',
                            confirmText: 'Change',
                            confirmCallback: function() {
                                nodeMonitor.postMessage({'reportDecision': report});
                                $('#report input[name='+report.decision_id+']').attr('data-state', report.state);
                            },
                            cancelCallback: function() {
                                $('#report input[name='+report.decision_id+'][value="'+state+'"]').attr('checked', true);
                            }
                        }
                        
                        augur.confirm(dialog);

                    } else {

                        nodeMonitor.postMessage({'reportDecision': report});
                        $('#report input[name='+report.decision_id+']').attr('data-state', report.state);
                        $('#'+report.decision_id).addClass('reported');

                    }
                });

            } else {

                $('#report').hide();
            }
        },

        branches: function(data) {

            if (!$.isEmptyObject(data)) {

                $('.branches').empty()

                // sort on reputation
                //data = data.sort(function(a,b) {return (a.rep > b.rep) ? -1 : ((b.rep > a.rep) ? 1 : 0);} );
                var has_branches = false;
                var has_others = false;

                _.each(data, function(branch) {

                    // update add decision modal
                    $('#decision-branch').append($('<option>').val(branch.id).text(branch.name));

                    if (branch.rep) {

                        has_branches = true;
                        var p = $('<p>').html('<span class="pull-left"><b>'+branch.name+'</b> ('+branch.rep+')</span>').addClass('clearfix');
                        var send = $('<a>').attr('href','#').addClass('pull-right').text('send').on('click', function() {
                            $('#branch-id').val(branch.id);
                            $('#send-rep-modal .rep-balance').text(branch.rep);
                            $('#send-rep-modal .branch').text(branch.name);
                            $('#send-rep-modal').modal('show');
                        })
                        p.append(send);

                    } else {

                        has_others = true;
                        var p = $('<p class="other">').html('<span>'+branch.name+'</span>');
                    }
                    $('.branches').append(p);
                });

                if (has_others) {
                    var bt = $('<a>').addClass('pull-right branches-toggle').on('click', function(event) {
                        $('.branches').toggleClass('all');
                    });
                    $('.branches').append(bt);
                }

            } else {

                var p = $('<p>').html('<span class="pull-left">There are no branches</span>');
                $('.branches').empty().append(p);
            }
        },

        account: function(data) {

            $('.account .address').html(data);
        },

        blockNumber: function(data) {

            $('.blocks span').text(data);
            $('.blocks').show();
        },

        gas: function(data) {

            $('.gas span').text(data);
            $('.gas').show();
        },

        gasPrice: function(data) {

            $('.gas-price span').text(data);
            $('.gas-price').show();
        },

        host: function(data) {

            $('.host span').text(data);
            $('.host').show();
        },

        peerCount: function(data) {

            $('.peers span').text(data);
            $('.peers').show();
        },

        miner: function(data) {

            $('.miner span').text(data ? 'on' : 'off');
            $('.miner').show();
        },

        markets: function(data) {

            if (!$.isEmptyObject(data)) {

                $('.decisions').empty();
                _.each(data, function(m) {

                    if (m) {
                        var row = $('<tr>').html('<td class="text">'+m.txt+'</td><td>'+m.vote_id+'</td><td>'+augur.formatDate(m.maturation_date)+'</td>');
                        var trade = $('<a>').attr('href', '#').text('trade').on('click', function() {
                            nodeMonitor.postMessage({'trade': m.decision_id});
                        });
                        if (m.status == 'open') {
                            var trade = $('<td>').append(trade).css('text-align', 'right');
                        } else if (m.status == 'pending') {
                            var trade = $('<td>').text('pending').css('text-align', 'right');
                        } else {
                            var trade = $('<td>').text('closed').css('text-align', 'right');
                        }
                        $(row).append(trade);
                        $('.decisions').append(row);
                    }
                });
            }
        },

        trade: function(data) {

            data.my_shares = data.my_shares ? data.my_shares : [0,0];
            var states = $('<select>').addClass('states, form-control').attr('name', 'market-state');
            var balances = $('<table>').addClass('table');
            balances.append($('<tr>').html('<th>State</th><th>Owned</th><th>Total</th>'));
            states.append($('<option>').text('Select'));
            _.each(data.states, function(state, i) {
                var s = state == '1' || String(state).toLowerCase() == 'yes' ? 'True' : 'False';
                balances.append($('<tr>').html('<td>'+s+'</td><td>'+data.my_shares[i]+'</td><td>'+data.shares_purchased[i]+'</td>'));
                states.append($('<option>').val(state).text(s));
            });

            // reset trade modal state
            $('#trade-modal input[name=trade-type]').removeAttr('checked');
            $('#trade-modal label.btn').removeClass('active');
            $('#trade-modal button.trade').text('-').attr('disabled', true);

            $('#trade-modal .decision-text').text(m.txt);
            $('#trade-modal .balances').empty().append(balances);
            $('#trade-market').val(data.PM_id);
            $('#trade-modal').modal('show');
            $('#market-state').empty().append(states);
        },

        balance: function(data) {

            $('.balance').text(data);
        }
    },

    // utility functions
    formatDate: function(d) {

        if (!d) return '-';

        months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Oct','Sep','Nov','Dec'];

        var hour = d.getHours() > 11  ? d.getHours() - 12 : d.getHours();
        hour = hour == 0 ? 12 : hour;
        var apm = d.getHours() > 10 || d.getHours() == 23 && d.getHours() != 0 ? 'pm' : 'am';
        var minutes = d.getMinutes() < 10 ? '0'+ d.getMinutes() : d.getMinutes();
  
        return months[d.getMonth()]+' '+d.getDate()+', '+hour+':'+minutes+' '+apm;
    },

    confirm: function(args) {

        $('#confirm-modal .message').html(args.message);
        if (args.cancelText) $('#confirm-modal button.cancel').text(args.cancelText);
        if (args.confirmText) $('#confirm-modal button.confirm').text(args.confirmText);

        $('#confirm-modal button.confirm').on('click', args.confirmCallback);
        $('#confirm-modal button.cancel').on('click', args.cancelCallback);

        $('#confirm-modal').modal('show');
    },

    abi:
[{
    "name": "api(int256,int256,int256,int256)",
    "type": "function",
    "inputs": [{ "name": "dataStructure", "type": "int256" }, { "name": "itemNumber", "type": "int256" }, { "name": "arrayIndex", "type": "int256" }, { "name": "ID", "type": "int256" }],
    "outputs": [{ "name": "unknown_out", "type": "int256[]" }]
},
{
    "name": "balance(int256)",
    "type": "function",
    "inputs": [{ "name": "address", "type": "int256" }],
    "outputs": [{ "name": "out", "type": "int256" }]
},
{
    "name": "buyShares(int256,int256,int256,int256)",
    "type": "function",
    "inputs": [{ "name": "branch", "type": "int256" }, { "name": "market", "type": "int256" }, { "name": "outcome", "type": "int256" }, { "name": "amount", "type": "int256" }],
    "outputs": [{ "name": "out", "type": "int256" }]
},
{
    "name": "calibrate_sets(int256[],int256,int256)",
    "type": "function",
    "inputs": [{ "name": "scores", "type": "int256[]" }, { "name": "num_players", "type": "int256" }, { "name": "num_events", "type": "int256" }],
    "outputs": [{ "name": "out", "type": "int256[]" }]
},
{
    "name": "calibrate_wsets(int256[],int256[],int256[],int256[],int256,int256)",
    "type": "function",
    "inputs": [{ "name": "set1", "type": "int256[]" }, { "name": "set2", "type": "int256[]" }, { "name": "reputation", "type": "int256[]" }, { "name": "reports", "type": "int256[]" }, { "name": "num_players", "type": "int256" }, { "name": "num_events", "type": "int256" }],
    "outputs": [{ "name": "out", "type": "int256[]" }]
},
{
    "name": "center(int256[],int256[],int256[],int256[],int256[],int256)",
    "type": "function",
    "inputs": [{ "name": "reports_filled", "type": "int256[]" }, { "name": "reputation", "type": "int256[]" }, { "name": "scaled", "type": "int256[]" }, { "name": "scaled_max", "type": "int256[]" }, { "name": "scaled_min", "type": "int256[]" }, { "name": "max_iterations", "type": "int256" }],
    "outputs": [{ "name": "out", "type": "int256[]" }]
},
{
    "name": "checkQuorum(int256)",
    "type": "function",
    "inputs": [{ "name": "branch", "type": "int256" }],
    "outputs": [{ "name": "out", "type": "int256" }]
},
{
    "name": "closeBet(int256)",
    "type": "function",
    "inputs": [{ "name": "betID", "type": "int256" }],
    "outputs": [{ "name": "out", "type": "int256" }]
},
{
    "name": "closeMarket(int256,int256)",
    "type": "function",
    "inputs": [{ "name": "branch", "type": "int256" }, { "name": "market", "type": "int256" }],
    "outputs": [{ "name": "unknown_out", "type": "int256[]" }]
},
{
    "name": "consensus(int256[],int256[],int256[],int256[],int256[],int256,int256)",
    "type": "function",
    "inputs": [{ "name": "smooth_rep", "type": "int256[]" }, { "name": "reports", "type": "int256[]" }, { "name": "scaled", "type": "int256[]" }, { "name": "scaled_max", "type": "int256[]" }, { "name": "scaled_min", "type": "int256[]" }, { "name": "num_players", "type": "int256" }, { "name": "num_events", "type": "int256" }],
    "outputs": [{ "name": "out", "type": "int256[]" }]
},
{
    "name": "createEvent(int256,string,int256,int256,int256,int256)",
    "type": "function",
    "inputs": [{ "name": "branch", "type": "int256" }, { "name": "description", "type": "string" }, { "name": "expDate", "type": "int256" }, { "name": "minValue", "type": "int256" }, { "name": "maxValue", "type": "int256" }, { "name": "numOutcomes", "type": "int256" }],
    "outputs": [{ "name": "out", "type": "int256" }]
},
{
    "name": "createMarket(int256,string,int256,int256,int256,int256[])",
    "type": "function",
    "inputs": [{ "name": "branch", "type": "int256" }, { "name": "description", "type": "string" }, { "name": "alpha", "type": "int256" }, { "name": "initialLiquidity", "type": "int256" }, { "name": "tradingFee", "type": "int256" }, { "name": "events", "type": "int256[]" }],
    "outputs": [{ "name": "out", "type": "int256" }]
},
{
    "name": "eventsExpApi(int256,int256,int256,int256,int256)",
    "type": "function",
    "inputs": [{ "name": "expDateIndex", "type": "int256" }, { "name": "itemNumber", "type": "int256" }, { "name": "arrayIndexOne", "type": "int256" }, { "name": "arrayIndexTwo", "type": "int256" }, { "name": "ID", "type": "int256" }],
    "outputs": [{ "name": "out", "type": "int256" }]
},
{
    "name": "faucet()",
    "type": "function",
    "inputs": [],
    "outputs": [{ "name": "out", "type": "int256" }]
},
{
    "name": "getAllEvents(int256,int256)",
    "type": "function",
    "inputs": [{ "name": "branch", "type": "int256" }, { "name": "expPeriod", "type": "int256" }],
    "outputs": [{ "name": "out", "type": "int256[]" }]
},
{
    "name": "getAllMarkets(int256)",
    "type": "function",
    "inputs": [{ "name": "branch", "type": "int256" }],
    "outputs": [{ "name": "out", "type": "int256[]" }]
},
{
    "name": "getRepBalance(int256,int256)",
    "type": "function",
    "inputs": [{ "name": "branch", "type": "int256" }, { "name": "address", "type": "int256" }],
    "outputs": [{ "name": "out", "type": "int256" }]
},
{
    "name": "interpolate(int256[],int256[],int256[],int256[],int256[])",
    "type": "function",
    "inputs": [{ "name": "reports", "type": "int256[]" }, { "name": "reputation", "type": "int256[]" }, { "name": "scaled", "type": "int256[]" }, { "name": "scaled_max", "type": "int256[]" }, { "name": "scaled_min", "type": "int256[]" }],
    "outputs": [{ "name": "out", "type": "int256[]" }]
},
{
    "name": "makeBallot(int256,int256)",
    "type": "function",
    "inputs": [{ "name": "branch", "type": "int256" }, { "name": "votePeriod", "type": "int256" }],
    "outputs": [{ "name": "out", "type": "int256[]" }]
},
{
    "name": "makeBet(int256,int256)",
    "type": "function",
    "inputs": [{ "name": "eventID", "type": "int256" }, { "name": "amtToBet", "type": "int256" }],
    "outputs": [{ "name": "out", "type": "int256" }]
},
{
    "name": "makeSubBranch(string,int256,int256)",
    "type": "function",
    "inputs": [{ "name": "description", "type": "string" }, { "name": "periodLength", "type": "int256" }, { "name": "parent", "type": "int256" }],
    "outputs": [{ "name": "out", "type": "int256" }]
},
{
    "name": "marketParticipantsApi(int256,int256,int256,int256,int256)",
    "type": "function",
    "inputs": [{ "name": "participantIndex", "type": "int256" }, { "name": "itemNumber", "type": "int256" }, { "name": "eventID", "type": "int256" }, { "name": "outcomeNumber", "type": "int256" }, { "name": "marketID", "type": "int256" }],
    "outputs": [{ "name": "out", "type": "int256" }]
},
{
    "name": "participation(int256[],int256[],int256[],int256[],int256,int256)",
    "type": "function",
    "inputs": [{ "name": "outcomes_final", "type": "int256[]" }, { "name": "consensus_reward", "type": "int256[]" }, { "name": "smooth_rep", "type": "int256[]" }, { "name": "reports_mask", "type": "int256[]" }, { "name": "num_players", "type": "int256" }, { "name": "num_events", "type": "int256" }],
    "outputs": [{ "name": "out", "type": "int256[]" }]
},
{
    "name": "pca_adjust(int256[],int256[],int256[],int256[],int256[],int256[],int256,int256)",
    "type": "function",
    "inputs": [{ "name": "old", "type": "int256[]" }, { "name": "new1", "type": "int256[]" }, { "name": "new2", "type": "int256[]" }, { "name": "set1", "type": "int256[]" }, { "name": "set2", "type": "int256[]" }, { "name": "scores", "type": "int256[]" }, { "name": "num_players", "type": "int256" }, { "name": "num_events", "type": "int256" }],
    "outputs": [{ "name": "out", "type": "int256[]" }]
},
{
    "name": "pca_loadings(int256[],int256[],int256[],int256,int256)",
    "type": "function",
    "inputs": [{ "name": "loading_vector", "type": "int256[]" }, { "name": "weighted_centered_data", "type": "int256[]" }, { "name": "reputation", "type": "int256[]" }, { "name": "num_players", "type": "int256" }, { "name": "num_events", "type": "int256" }],
    "outputs": [{ "name": "out", "type": "int256[]" }]
},
{
    "name": "pca_scores(int256[],int256[],int256,int256)",
    "type": "function",
    "inputs": [{ "name": "loading_vector", "type": "int256[]" }, { "name": "weighted_centered_data", "type": "int256[]" }, { "name": "num_players", "type": "int256" }, { "name": "num_events", "type": "int256" }],
    "outputs": [{ "name": "out", "type": "int256[]" }]
},
{
    "name": "redeem(int256)",
    "type": "function",
    "inputs": [{ "name": "branch", "type": "int256" }],
    "outputs": [{ "name": "unknown_out", "type": "int256[]" }]
},
{
    "name": "reputation(int256,int256)",
    "type": "function",
    "inputs": [{ "name": "address", "type": "int256" }, { "name": "branch", "type": "int256" }],
    "outputs": [{ "name": "out", "type": "int256[]" }]
},
{
    "name": "reputationApi(int256,int256,int256)",
    "type": "function",
    "inputs": [{ "name": "reputationIndex", "type": "int256" }, { "name": "itemNumber", "type": "int256" }, { "name": "branchID", "type": "int256" }],
    "outputs": [{ "name": "out", "type": "int256" }]
},
{
    "name": "sellShares(int256,int256,int256,int256)",
    "type": "function",
    "inputs": [{ "name": "branch", "type": "int256" }, { "name": "market", "type": "int256" }, { "name": "outcome", "type": "int256" }, { "name": "amount", "type": "int256" }],
    "outputs": [{ "name": "out", "type": "int256" }]
},
{
    "name": "send(int256,int256)",
    "type": "function",
    "inputs": [{ "name": "recver", "type": "int256" }, { "name": "value", "type": "int256" }],
    "outputs": [{ "name": "out", "type": "int256" }]
},
{
    "name": "sendFrom(int256,int256,int256)",
    "type": "function",
    "inputs": [{ "name": "recver", "type": "int256" }, { "name": "value", "type": "int256" }, { "name": "from", "type": "int256" }],
    "outputs": [{ "name": "out", "type": "int256" }]
},
{
    "name": "sendMoneytoBet(int256,int256)",
    "type": "function",
    "inputs": [{ "name": "betID", "type": "int256" }, { "name": "outcome", "type": "int256" }],
    "outputs": [{ "name": "out", "type": "int256" }]
},
{
    "name": "sendReputation(int256,int256,int256)",
    "type": "function",
    "inputs": [{ "name": "branch", "type": "int256" }, { "name": "recver", "type": "int256" }, { "name": "value", "type": "int256" }],
    "outputs": [{ "name": "unknown_out", "type": "int256[]" }]
},
{
    "name": "smooth(int256[],int256[],int256,int256)",
    "type": "function",
    "inputs": [{ "name": "adjusted_scores", "type": "int256[]" }, { "name": "reputation", "type": "int256[]" }, { "name": "num_players", "type": "int256" }, { "name": "num_events", "type": "int256" }],
    "outputs": [{ "name": "out", "type": "int256[]" }]
},
{
    "name": "transferShares(int256,int256,int256,int256,int256)",
    "type": "function",
    "inputs": [{ "name": "branch", "type": "int256" }, { "name": "market", "type": "int256" }, { "name": "outcome", "type": "int256" }, { "name": "amount", "type": "int256" }, { "name": "to", "type": "int256" }],
    "outputs": [{ "name": "out", "type": "int256" }]
},
{
    "name": "vote(int256,int256[],int256)",
    "type": "function",
    "inputs": [{ "name": "branch", "type": "int256" }, { "name": "report", "type": "int256[]" }, { "name": "votePeriod", "type": "int256" }],
    "outputs": [{ "name": "out", "type": "int256" }]
}]
}

// start
$(document).ready(augur.start);